import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { TEMPLATES, getTemplate } from "@/lib/engines/templates";
import { buildStoryArc, buildTimeline } from "@/lib/engines/director";
import { analyzeAudio } from "@/lib/engines/beat";
import { exportVideo } from "@/lib/engines/export";
import { createRenderer } from "@/lib/engines/renderer";
import { fileToImageAsset } from "@/lib/upload";
import { Preview } from "@/components/studio/Preview";
import { TimelineStrip } from "@/components/studio/TimelineStrip";
import { UploadZone } from "@/components/studio/UploadZone";
import { tagImages, directStory } from "@/lib/ai/director.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Music, Sparkles, Wand2, X } from "lucide-react";

export const Route = createFileRoute("/editor/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Editor — Cinema` },
      { name: "description", content: `Editing project ${params.id}.` },
    ],
  }),
  component: EditorPage,
  notFoundComponent: () => (
    <div className="p-12 text-muted-foreground">Project not found.</div>
  ),
});

function EditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const project = useStudio((s) => s.projects.find((p) => p.id === id));
  const {
    setAssets, setMeta, setMusic, setStory, setTimeline,
    setRender, updateProject, deleteProject,
  } = useStudio();

  const tagImagesFn = useServerFn(tagImages);
  const directStoryFn = useServerFn(directStory);

  const [aiBusy, setAiBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  if (!project) throw notFound();

  const template = getTemplate(project.templateId);

  const timeline = useMemo(() => {
    if (project.assets.length === 0) return null;
    return project.timeline ?? buildTimeline(project);
  }, [project]);

  const onAddImages = async (files: File[]) => {
    const next = await Promise.all(files.map(fileToImageAsset));
    setAssets(project.id, [...project.assets, ...next]);
    // Rebuild a fresh timeline immediately so the preview reflects the new shots
    const updated = { ...project, assets: [...project.assets, ...next], story: undefined, timeline: undefined };
    setTimeline(project.id, buildTimeline(updated));
  };

  const onRemoveImage = (assetId: string) => {
    const assets = project.assets.filter((a) => a.id !== assetId);
    setAssets(project.id, assets);
    const updated = { ...project, assets, story: undefined, timeline: undefined };
    if (assets.length) setTimeline(project.id, buildTimeline(updated));
  };

  const onMusic = async (files: File[]) => {
    const file = files[0];
    const src = URL.createObjectURL(file);
    setMusic(project.id, { src, name: file.name });
    toast("Analyzing tempo…");
    try {
      const beatMap = await analyzeAudio(src);
      setMusic(project.id, { src, name: file.name, beatMap });
      toast.success(`Detected ${beatMap.bpm} BPM · ${beatMap.beats.length} beats`);
      const updated = { ...project, music: { src, name: file.name, beatMap } };
      setTimeline(project.id, buildTimeline(updated));
    } catch {
      toast.error("Couldn't analyze that track.");
    }
  };

  const runAiDirector = async () => {
    if (project.assets.length === 0) {
      toast.error("Add some images first.");
      return;
    }
    setAiBusy(true);
    try {
      toast("Reading frames with AI vision…");
      const meta = await tagImagesFn({
        data: { images: project.assets.map((a) => ({ id: a.id, src: a.src })) },
      });
      setMeta(project.id, meta);

      toast("Writing the edit…");
      const story = await directStoryFn({
        data: {
          prompt: project.prompt,
          mood: template.mood,
          baseShotDuration: template.baseShotDuration,
          meta: project.assets.map((a) => {
            const m = meta[a.id];
            return {
              id: a.id,
              caption: m?.caption ?? null,
              emotion: m?.emotion ?? null,
              heroScore: m?.heroScore ?? 0.5,
            };
          }),
        },
      });
      setStory(project.id, story);
      const updated = { ...project, meta, story };
      setTimeline(project.id, buildTimeline(updated));
      toast.success("Director cut ready.");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "AI Director failed.";
      toast.error(msg);
      // Fall back to local heuristic director so the user still sees a timeline
      const story = buildStoryArc(project.assets, project.meta, template, project.prompt);
      setStory(project.id, story);
      setTimeline(project.id, buildTimeline({ ...project, story }));
    } finally {
      setAiBusy(false);
    }
  };

  const onExport = async () => {
    if (!timeline) return;
    setExporting(true);
    setRender(project.id, { status: "rendering", progress: 0, outputUrl: undefined, error: undefined });
    try {
      const canvas = exportCanvasRef.current!;
      const renderer = await createRenderer({ canvas, timeline, assets: project.assets });
      let audioEl: HTMLAudioElement | undefined;
      if (project.music?.src) {
        audioEl = new Audio(project.music.src);
        audioEl.crossOrigin = "anonymous";
      }
      const blob = await exportVideo({
        renderer,
        canvas,
        timeline,
        audioElement: audioEl,
        onProgress: (p) => setRender(project.id, { progress: p }),
      });
      const url = URL.createObjectURL(blob);
      setRender(project.id, { status: "done", progress: 1, outputUrl: url });
      toast.success("Film exported.");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Export failed.";
      setRender(project.id, { status: "error", error: msg });
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_360px]">
      {/* Main */}
      <div className="flex flex-col gap-6 px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <input
              value={project.name}
              onChange={(e) => updateProject(project.id, { name: e.target.value })}
              className="w-full bg-transparent font-display text-3xl outline-none focus:text-accent"
            />
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              {template.name} · {project.assets.length} images
              {project.music ? ` · ${project.music.name}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAiDirector}
              disabled={aiBusy || project.assets.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {aiBusy ? "Directing…" : "Run AI Director"}
            </button>
            <button
              onClick={onExport}
              disabled={!timeline || exporting}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>
        </header>

        {timeline ? (
          <>
            <Preview timeline={timeline} assets={project.assets} audioUrl={project.music?.src} />
            <TimelineStrip timeline={timeline} />
          </>
        ) : (
          <UploadZone
            accept="image/*"
            multiple
            label="Drop your photos to begin"
            hint="JPG / PNG / WEBP — 3 to 30 images works best"
            onFiles={onAddImages}
          />
        )}

        {project.assets.length > 0 && (
          <section>
            <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Source images
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
              {project.assets.map((a) => (
                <div
                  key={a.id}
                  className="group relative aspect-square overflow-hidden rounded-md border border-border"
                >
                  <img src={a.src} alt="" className="h-full w-full object-cover" />
                  {project.meta[a.id]?.emotion && (
                    <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                      {project.meta[a.id].emotion}
                    </span>
                  )}
                  <button
                    onClick={() => onRemoveImage(a.id)}
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded bg-background/80 text-muted-foreground hover:text-destructive group-hover:flex"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-2xl text-muted-foreground hover:border-accent/60 hover:text-accent">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) onAddImages(files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </section>
        )}

        {/* Hidden offscreen canvas used by export pipeline */}
        <canvas ref={exportCanvasRef} className="hidden" />
      </div>

      {/* Inspector */}
      <aside className="border-t border-border bg-sidebar px-6 py-8 lg:border-l lg:border-t-0">
        <section>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Prompt</p>
          <textarea
            value={project.prompt}
            onChange={(e) => updateProject(project.id, { prompt: e.target.value })}
            placeholder="e.g. A weekend in Lisbon, golden hour, intimate."
            className="mt-2 h-24 w-full resize-none rounded-md border border-border bg-background/40 p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-accent/60"
          />
        </section>

        <section className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Template</p>
          <div className="mt-2 space-y-2">
            {TEMPLATES.map((t) => {
              const active = t.id === project.templateId;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    updateProject(project.id, { templateId: t.id, story: undefined, timeline: undefined });
                    const updated = { ...project, templateId: t.id, story: undefined, timeline: undefined };
                    if (updated.assets.length) setTimeline(project.id, buildTimeline(updated));
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    active ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                  }`}
                >
                  <p className="font-display">{t.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Music</p>
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background/40 p-3 text-sm text-muted-foreground hover:border-accent/60">
            <Music className="h-4 w-4" />
            {project.music ? project.music.name : "Upload an audio file"}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) onMusic(files);
                e.target.value = "";
              }}
            />
          </label>
          {project.music?.beatMap && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {project.music.beatMap.bpm} BPM · {project.music.beatMap.beats.length} beats ·{" "}
              {project.music.beatMap.duration.toFixed(1)}s
            </p>
          )}
        </section>

        {project.story && (
          <section className="mt-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Story arc</p>
            <ol className="mt-2 space-y-1 text-sm">
              {project.story.beats.map((b, i) => (
                <li key={i} className="flex gap-2 rounded-md border border-border bg-card/40 p-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                    {b.act}
                  </span>
                  <span className="line-clamp-2 text-muted-foreground">{b.caption}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="mt-10 border-t border-border pt-6">
          <button
            onClick={() => {
              deleteProject(project.id);
              navigate({ to: "/projects" });
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Delete project
          </button>
          {project.render.outputUrl && (
            <a
              href={project.render.outputUrl}
              download={`${project.name}.webm`}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground"
            >
              <Wand2 className="h-3 w-3" /> Download last export
            </a>
          )}
        </section>
      </aside>
    </div>
  );
}
