import type { Timeline } from "@/lib/engines/types";
import { cn } from "@/lib/utils";

export function TimelineStrip({ timeline }: { timeline: Timeline }) {
  const total = Math.max(timeline.duration, 0.001);
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono uppercase tracking-widest">Timeline</span>
        <span className="font-mono tabular-nums">
          {timeline.shots.length} shots · {timeline.duration.toFixed(1)}s · {timeline.fps}fps
        </span>
      </div>
      <div className="flex h-14 w-full overflow-hidden rounded-md bg-background">
        {timeline.shots.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "group relative h-full border-r border-border last:border-r-0",
              "flex items-end justify-start px-2 pb-1 text-[10px] uppercase tracking-wider",
            )}
            style={{
              width: `${(s.duration / total) * 100}%`,
              background:
                i % 2 === 0
                  ? "linear-gradient(180deg, color-mix(in oklab, var(--accent) 18%, transparent), transparent)"
                  : "linear-gradient(180deg, color-mix(in oklab, var(--foreground) 6%, transparent), transparent)",
            }}
            title={`${s.camera} · ${s.transitionIn}`}
          >
            <span className="truncate text-muted-foreground">{s.camera}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
