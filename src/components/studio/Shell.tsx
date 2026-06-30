import { Link, useLocation } from "@tanstack/react-router";
import {
  Film,
  FolderOpen,
  LayoutGrid,
  ListVideo,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav: Array<{ to: string; label: string; icon: typeof Film; exact?: boolean }> = [
  { to: "/", label: "Studio", icon: Sparkles, exact: true },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/templates", label: "Templates", icon: LayoutGrid },
  { to: "/queue", label: "Render Queue", icon: ListVideo },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="relative z-10 flex min-h-screen text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <Link to="/" className="mb-10 flex items-center gap-2 px-2">
          <Film className="h-5 w-5 text-accent" />
          <span className="font-display text-lg tracking-tight">Cinema</span>
          <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-accent">
            Studio
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground">
          <p className="font-display text-sm text-foreground">AI Director</p>
          <p className="mt-1 leading-relaxed">
            Photos in. Story, motion, camera and cut decided automatically.
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">{children}</main>
    </div>
  );
}
