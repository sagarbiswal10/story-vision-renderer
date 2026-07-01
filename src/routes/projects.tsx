import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useStudio } from "@/lib/store";
import { TEMPLATES } from "@/lib/engines/templates";
import { Plus, Trash2, Search, Grid3x3, List, Sparkles, Clock, Star, User, ArrowUpDown, Import } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Workspace — Cinema" },
      { name: "description", content: "All your AI-directed films in one place." },
    ],
  }),
  component: ProjectsPage,
});

type Tab = "all" | "recent" | "created" | "favorites";

function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, createProject, deleteProject } = useStudio();
  const [tab, setTab] = useState<Tab>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let list = [...projects];
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s));
    }
    if (tab === "recent") list.sort((a, b) => b.updatedAt - a.updatedAt);
    if (tab === "created") list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [projects, q, tab]);

  const startNew = () => {
    const p = createProject({});
    navigate({ to: "/editor/$id", params: { id: p.id } });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-10">
      {/* Header row */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-3 font-display text-3xl">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/15 text-accent">
            <Sparkles className="h-4 w-4" />
          </span>
          Workspace
        </h1>
        <div className="flex items-center gap-2">
          <button className="hidden items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground md:inline-flex">
            <Sparkles className="h-3 w-3 text-accent" /> 388 credits
          </button>
        </div>
      </div>

      {/* Primary actions row (Gamma-style) */}
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <button
          onClick={startNew}
          className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
        >
          <Sparkles className="h-4 w-4 text-accent" />
          Create with AI
        </button>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-5 py-2.5 text-sm hover:border-accent/60 hover:text-accent"
        >
          <Plus className="h-4 w-4" /> New film
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground">
          <Import className="h-4 w-4" /> Import
        </button>
      </div>

      {/* Tabs + controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/30 p-1 text-sm">
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            <Grid3x3 className="h-3.5 w-3.5" /> All
          </TabButton>
          <TabButton active={tab === "recent"} onClick={() => setTab("recent")}>
            <Clock className="h-3.5 w-3.5" /> Recently viewed
          </TabButton>
          <TabButton active={tab === "created"} onClick={() => setTab("created")}>
            <User className="h-3.5 w-3.5" /> Created by you
          </TabButton>
          <TabButton active={tab === "favorites"} onClick={() => setTab("favorites")}>
            <Star className="h-3.5 w-3.5" /> Favorites
          </TabButton>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/30 px-3 py-1.5 text-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search films"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/30 text-muted-foreground hover:text-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center rounded-full border border-border bg-card/30 p-1">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
                view === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <Grid3x3 className="h-3.5 w-3.5" /> Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
                view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
        </div>
      </div>

      {/* Grid / list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/20 p-24 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="mt-4 font-display text-xl">Your workspace is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a new film — the AI Director takes it from there.
          </p>
          <button
            onClick={startNew}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm text-accent-foreground"
          >
            <Plus className="h-4 w-4" /> Create your first film
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* New-project tile like Gamma's placeholder cards */}
          <button
            onClick={startNew}
            className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/20 text-muted-foreground transition-colors hover:border-accent/60 hover:text-accent"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-card/60">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm">New film</span>
          </button>

          {filtered.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 transition-colors hover:border-accent/40"
            >
              <Link to="/editor/$id" params={{ id: p.id }} className="block">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                  {p.assets[0] ? (
                    <img
                      src={p.assets[0].src}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-muted-foreground">
                      Empty timeline
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                  <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent backdrop-blur">
                    {TEMPLATES.find((t) => t.id === p.templateId)?.name}
                  </div>
                </div>
                <div className="p-4">
                  <p className="truncate font-display text-lg">{p.name}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {p.assets.length} shots · {p.render.status}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => deleteProject(p.id)}
                className="absolute right-3 top-3 hidden rounded-md border border-border bg-background/80 p-1.5 text-muted-foreground hover:text-destructive group-hover:flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card/30">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to="/editor/$id"
              params={{ id: p.id }}
              className="flex items-center gap-4 px-5 py-3 hover:bg-card/60"
            >
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-black">
                {p.assets[0] && <img src={p.assets[0].src} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base">{p.name}</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {TEMPLATES.find((t) => t.id === p.templateId)?.name} · {p.assets.length} shots
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(p.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
