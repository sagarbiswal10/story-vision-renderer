import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStudio } from "@/lib/store";
import { TEMPLATES } from "@/lib/engines/templates";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Cinema" },
      { name: "description", content: "All your AI-directed films in one place." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, createProject, deleteProject } = useStudio();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Library</p>
          <h1 className="mt-1 font-display text-4xl">Projects</h1>
        </div>
        <button
          onClick={() => {
            const p = createProject({});
            navigate({ to: "/editor/$id", params: { id: p.id } });
          }}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
        >
          <Plus className="h-4 w-4" /> New film
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-20 text-center text-muted-foreground">
          Nothing here yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card/60"
            >
              <Link
                to="/editor/$id"
                params={{ id: p.id }}
                className="block"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  {p.assets[0] ? (
                    <img src={p.assets[0].src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No images
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-4">
                  <p className="font-display text-lg">{p.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {TEMPLATES.find((t) => t.id === p.templateId)?.name} ·{" "}
                    {p.assets.length} images · {p.render.status}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => deleteProject(p.id)}
                className="absolute right-3 top-3 hidden rounded-md border border-border bg-background/80 p-2 text-muted-foreground hover:text-destructive group-hover:flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
