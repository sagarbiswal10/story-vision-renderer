import { createFileRoute, Link } from "@tanstack/react-router";
import { useStudio } from "@/lib/store";
import { Download, Loader2 } from "lucide-react";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Render Queue — Cinema" },
      { name: "description", content: "All in-flight and finished renders." },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const { projects } = useStudio();
  const renders = projects.filter((p) => p.render.status !== "idle");

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="font-display text-4xl">Render Queue</h1>
      <p className="mt-2 text-muted-foreground">
        Exports are produced in-browser via canvas + MediaRecorder. Server-side
        Remotion rendering plugs in behind the same interface later.
      </p>

      <div className="mt-10 space-y-3">
        {renders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
            No active renders.
          </div>
        ) : (
          renders.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-4"
            >
              <div className="h-12 w-20 overflow-hidden rounded-md bg-black">
                {p.assets[0] && (
                  <img src={p.assets[0].src} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <Link
                  to="/editor/$id"
                  params={{ id: p.id }}
                  className="font-display text-lg hover:text-accent"
                >
                  {p.name}
                </Link>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${Math.round(p.render.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.render.status === "rendering" ? "Rendering" : p.render.status} ·{" "}
                  {Math.round(p.render.progress * 100)}%
                </p>
              </div>
              {p.render.status === "rendering" ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : p.render.outputUrl ? (
                <a
                  href={p.render.outputUrl}
                  download={`${p.name}.webm`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
