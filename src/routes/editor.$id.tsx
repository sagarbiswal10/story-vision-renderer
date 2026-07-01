import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { TEMPLATES, getTemplate } from "@/lib/engines/templates";
import { buildStoryArc, buildTimeline, detectTemplate } from "@/lib/engines/director";
import { analyzeAudio } from "@/lib/engines/beat";
import { exportVideo } from "@/lib/engines/export";
import { createRenderer } from "@/lib/engines/renderer";
import { fileToImageAsset } from "@/lib/upload";
import { Preview } from "@/components/studio/Preview";
import { UploadZone } from "@/components/studio/UploadZone";
import { tagImages, directStory, editStoryWithPrompt } from "@/lib/ai/director.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Music,
  Sparkles,
  Wand2,
  X,
  ImagePlus,
  Type,
  Layers,
  Sliders,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const editStoryFn = useServerFn(editStoryWithPrompt);

  const [aiBusy, setAiBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [exporting, setExporting] = useState(false);
  const [rightTab, setRightTab] = useState<"generate" | "media" | "styles">("generate");
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
      console.error("AI Director failed:", e);
      const msg = e instanceof Error ? e.message : "AI Director failed.";
      toast.error(msg + " — using local director.");
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
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar/80 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate({ to: "/projects" })}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <input
              value={project.name}
              onChange={(e) => updateProject(project.id, { name: e.target.value })}
              className="w-full max-w-xs bg-transparent font-display text-lg outline-none focus:text-accent"
            />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {template.name} · {project.assets.length} images
              {project.music ? ` · ${project.music.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAiDirector}
            disabled={aiBusy || project.assets.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiBusy ? "Directing…" : "Run AI Director"}
          </button>
          <button
            onClick={onExport}
            disabled={!timeline || exporting}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm disabled:opacity-50 hover:border-accent/60"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? `Exporting ${Math.round(project.render.progress * 100)}%` : "Export"}
          </button>
        </div>
      </header>

      {/* Main 3-column: script / preview+timeline / inspector */}
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr_360px]">
        {/* LEFT — Script / Story panel */}
        <aside className="flex min-h-0 flex-col border-r border-border bg-sidebar/40">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Script</p>
            <button className="text-[11px] uppercase tracking-widest text-accent">Write</button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5 py-6">
            <textarea
              value={project.prompt}
              onChange={(e) => updateProject(project.id, { prompt: e.target.value })}
              placeholder="Describe your film. e.g. A weekend in Lisbon, golden hour, intimate."
              className="mb-6 h-24 w-full resize-none rounded-lg border border-border bg-background/40 p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />

            {project.story ? (
              <ol className="space-y-4 text-[15px] leading-relaxed">
                {project.story.beats.map((b, i) => {
                  const asset = project.assets.find((a) => a.id === b.imageId);
                  return (
                    <li key={i} className="flex gap-3">
                      {asset ? (
                        <img
                          src={asset.src}
                          alt=""
                          className="mt-1 h-8 w-8 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="mt-1 h-8 w-8 shrink-0 rounded-md bg-card" />
                      )}
                      <p className="text-foreground/90">
                        <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-accent">
                          {b.act}
                        </span>
                        {b.caption ?? "Untitled shot."}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Run the AI Director to generate a script from your images.
              </div>
            )}
          </div>
        </aside>

        {/* CENTER — Preview + Timeline */}
        <section className="flex min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-black/60 p-6">
            {timeline ? (
              <div className="max-h-full w-full max-w-4xl">
                <Preview
                  timeline={timeline}
                  assets={project.assets}
                  audioUrl={project.music?.src}
                />
              </div>
            ) : (
              <div className="w-full max-w-lg">
                <UploadZone
                  accept="image/*"
                  multiple
                  label="Drop photos to begin"
                  hint="JPG / PNG / WEBP — 3 to 30 images"
                  onFiles={onAddImages}
                />
              </div>
            )}
          </div>

          {/* Timeline bar */}
          <div className="h-48 shrink-0 border-t border-border bg-sidebar/60">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-widest">Timeline</span>
                {timeline && (
                  <span className="font-mono tabular-nums">
                    {timeline.shots.length} shots · {timeline.duration.toFixed(1)}s · {timeline.fps}fps
                  </span>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-accent">
                <ImagePlus className="h-3 w-3" /> Add clips
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

            {/* Ruler */}
            <div className="relative h-4 border-b border-border bg-background/30 px-4">
              {timeline &&
                Array.from({ length: Math.max(1, Math.ceil(timeline.duration / 2)) + 1 }).map(
                  (_, i) => {
                    const pct = (i * 2) / Math.max(timeline.duration, 0.001);
                    return (
                      <span
                        key={i}
                        style={{ left: `${Math.min(100, pct * 100)}%` }}
                        className="absolute top-0 -translate-x-1/2 font-mono text-[9px] text-muted-foreground/70"
                      >
                        0:{String(i * 2).padStart(2, "0")}
                      </span>
                    );
                  },
                )}
            </div>

            {/* Clips row */}
            <div className="relative flex h-16 items-stretch overflow-hidden border-b border-border/60 bg-background/20 px-1">
              {timeline?.shots.map((s) => {
                const asset = project.assets.find((a) => a.id === s.imageId);
                const total = Math.max(timeline.duration, 0.001);
                return (
                  <div
                    key={s.id}
                    style={{ width: `${(s.duration / total) * 100}%` }}
                    className="relative m-0.5 overflow-hidden rounded-sm border border-border/60 bg-card"
                  >
                    {asset && (
                      <img
                        src={asset.src}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                      />
                    )}
                    <span className="absolute bottom-0.5 left-1 rounded bg-black/70 px-1 text-[9px] uppercase tracking-widest text-accent">
                      {s.camera}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Audio row */}
            <div className="relative h-12 bg-background/10 px-1">
              {project.music?.beatMap ? (
                <div className="flex h-full items-center gap-[1px] px-1">
                  {Array.from({ length: 200 }).map((_, i) => {
                    const h = 20 + Math.abs(Math.sin(i * 0.7) * 60 + Math.cos(i * 1.3) * 30);
                    return (
                      <span
                        key={i}
                        style={{ height: `${Math.min(90, h)}%` }}
                        className="w-[3px] rounded-sm bg-accent/60"
                      />
                    );
                  })}
                </div>
              ) : (
                <label className="flex h-full cursor-pointer items-center justify-center gap-2 text-xs text-muted-foreground hover:text-accent">
                  <Music className="h-3.5 w-3.5" />
                  Drop music to lock cuts to the beat
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
              )}
            </div>
          </div>
        </section>

        {/* RIGHT — Inspector (Descript-like generate media) */}
        <aside className="flex min-h-0 flex-col border-l border-border bg-sidebar/40">
          <div className="flex border-b border-border">
            {(
              [
                { k: "generate", label: "Generate", icon: Wand2 },
                { k: "media", label: "Media", icon: Layers },
                { k: "styles", label: "Style", icon: Sliders },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                onClick={() => setRightTab(t.k)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-3 text-xs uppercase tracking-widest transition-colors",
                  rightTab === t.k
                    ? "border-b-2 border-accent text-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
            {rightTab === "generate" && (
              <>
                <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-background/40 p-1 text-xs">
                  <button className="flex-1 rounded-full py-1.5 text-muted-foreground">
                    <ImagePlus className="mx-auto h-3.5 w-3.5" />
                  </button>
                  <button className="flex-1 rounded-full bg-accent py-1.5 text-accent-foreground">
                    <VideoIcon className="mx-auto h-3.5 w-3.5" />
                  </button>
                </div>

                <label className="mb-2 block text-[11px] uppercase tracking-widest text-muted-foreground">
                  Director model
                </label>
                <button className="mb-4 flex w-full items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Gemini Vision · 3 Flash
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>

                <label className="mb-2 block text-[11px] uppercase tracking-widest text-muted-foreground">
                  Direction prompt
                </label>
                <textarea
                  value={project.prompt}
                  onChange={(e) => updateProject(project.id, { prompt: e.target.value })}
                  placeholder="A cyclist gliding through a vibrant neon-lit cityscape at night, low-angle shot…"
                  className="mb-3 h-32 w-full resize-none rounded-lg border border-border bg-background/40 p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-accent/60"
                />

                <div className="mb-4 grid grid-cols-3 gap-2 text-[11px]">
                  <Chip icon={<Type className="h-3 w-3" />} label="16:9" />
                  <Chip label="5s / shot" />
                  <Chip label="Cinematic" />
                </div>

                <button
                  onClick={runAiDirector}
                  disabled={aiBusy || project.assets.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiBusy ? "Directing…" : "Direct film"}
                </button>

                {project.story?.beats?.[0] && (
                  <div className="mt-6 rounded-lg border border-border bg-background/40 p-3">
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Latest cut
                    </p>
                    <p className="text-xs text-foreground/80 line-clamp-4">
                      {project.story.beats.map((b) => b.caption).join(" ")}
                    </p>
                  </div>
                )}
              </>
            )}

            {rightTab === "media" && (
              <>
                <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Source images
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {project.assets.map((a) => (
                    <div
                      key={a.id}
                      className="group relative aspect-square overflow-hidden rounded-md border border-border"
                    >
                      <img src={a.src} alt="" className="h-full w-full object-cover" />
                      {project.meta[a.id]?.emotion && (
                        <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
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
                  <label className="grid aspect-square cursor-pointer place-items-center rounded-md border border-dashed border-border text-lg text-muted-foreground hover:border-accent/60 hover:text-accent">
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

                <p className="mb-2 mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Music
                </p>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background/40 p-3 text-xs text-muted-foreground hover:border-accent/60">
                  <Music className="h-3.5 w-3.5" />
                  {project.music ? project.music.name : "Upload audio"}
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
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                    {project.music.beatMap.bpm} BPM · {project.music.beatMap.beats.length} beats
                  </p>
                )}
              </>
            )}

            {rightTab === "styles" && (
              <>
                <p className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Template
                </p>
                <div className="space-y-2">
                  {TEMPLATES.map((t) => {
                    const active = t.id === project.templateId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          updateProject(project.id, {
                            templateId: t.id,
                            story: undefined,
                            timeline: undefined,
                          });
                          const updated = {
                            ...project,
                            templateId: t.id,
                            story: undefined,
                            timeline: undefined,
                          };
                          if (updated.assets.length)
                            setTimeline(project.id, buildTimeline(updated));
                        }}
                        className={cn(
                          "w-full rounded-lg border p-3 text-left transition-colors",
                          active
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/40",
                        )}
                      >
                        <p className="font-display">{t.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 border-t border-border pt-6">
                  <button
                    onClick={() => {
                      deleteProject(project.id);
                      navigate({ to: "/projects" });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Delete project
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
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Hidden export canvas */}
      <canvas ref={exportCanvasRef} className="hidden" />
    </div>
  );
}

function Chip({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-md border border-border bg-background/40 px-2 py-1.5 text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}
