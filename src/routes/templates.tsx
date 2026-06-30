import { createFileRoute } from "@tanstack/react-router";
import { TEMPLATES } from "@/lib/engines/templates";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Cinema" },
      {
        name: "description",
        content:
          "Cinematic editing recipes. Each template is a JSON description of camera vocabulary, transitions, pacing, color grade and motion intensity.",
      },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Library</p>
        <h1 className="mt-1 font-display text-4xl">Templates</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A template is a cinematic editing recipe — pacing, camera, transitions, grade.
          The AI Director composes a movie inside the chosen recipe.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <article
            key={t.id}
            className="overflow-hidden rounded-xl border border-border bg-card/60"
          >
            <div
              className="h-32 w-full"
              style={{
                background: `linear-gradient(135deg,
                  color-mix(in oklab, var(--accent) ${20 + t.motionIntensity * 60}%, var(--card)),
                  var(--card))`,
              }}
            />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">{t.name}</h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t.baseShotDuration}s · {Math.round(t.beatSync * 100)}% sync
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.cameraVocabulary.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
