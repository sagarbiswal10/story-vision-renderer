import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Film, Sparkles, Wand2 } from "lucide-react";
import { useStudio } from "@/lib/store";
import { TEMPLATES } from "@/lib/engines/templates";
import { motion } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cinema — AI Video Studio" },
      {
        name: "description",
        content:
          "Upload photos. The AI Director writes the story, picks the camera, locks cuts to the beat, and delivers a finished film.",
      },
    ],
  }),
  component: StudioHome,
});

function StudioHome() {
  const navigate = useNavigate();
  const { projects, createProject } = useStudio();

  const start = () => {
    const p = createProject({});
    navigate({ to: "/editor/$id", params: { id: p.id } });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.6, 0.2, 1] }}
        className="max-w-3xl"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" />
          AI Cinematic Direction
        </div>
        <h1 className="font-display text-5xl leading-[1.05] text-balance md:text-7xl">
          Your photos, directed like a&nbsp;
          <span className="text-accent">film</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
          Drop in images. Pick a cinematic recipe. The Director reads the
          emotion, locks the cuts to the beat, and builds a finished movie —
          camera moves, transitions, grade, grain and all.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button
            onClick={start}
            className="group inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-transform hover:-translate-y-0.5"
          >
            <Wand2 className="h-4 w-4" />
            Start a new film
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <Link
            to="/templates"
            className="rounded-md border border-border px-5 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Browse templates
          </Link>
        </div>
      </motion.div>

      <section className="mt-20">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Recent projects</h2>
          <Link to="/projects" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            All projects →
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
            <Film className="mx-auto h-6 w-6 text-accent" />
            <p className="mt-3">No films yet. Start one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to="/editor/$id"
                params={{ id: p.id }}
                className="group overflow-hidden rounded-xl border border-border bg-card/60 transition-colors hover:border-accent/60"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  {p.assets[0] ? (
                    <img
                      src={p.assets[0].src}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Empty timeline
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="font-display text-lg">{p.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {p.assets.length} shots · {TEMPLATES.find((t) => t.id === p.templateId)?.name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        {[
          { t: "Vision Engine", d: "Reads each frame: who, what, mood, hero quality." },
          { t: "Story Engine", d: "Five-act arc. Opening → buildup → peak → ending." },
          { t: "Beat Engine", d: "Detects BPM & beats. Cuts lock to the music." },
        ].map((b) => (
          <div key={b.t} className="rounded-xl border border-border bg-card/40 p-5">
            <p className="font-display text-lg">{b.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
