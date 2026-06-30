/**
 * Studio Preview — RAF playback of a Timeline through the canvas Renderer.
 *
 * Owns nothing about timeline construction. Pure playback surface.
 */
import { useEffect, useRef, useState } from "react";
import { createRenderer, type Renderer } from "@/lib/engines/renderer";
import type { ImageAsset, Timeline } from "@/lib/engines/types";
import { Pause, Play, RotateCcw } from "lucide-react";

interface Props {
  timeline: Timeline;
  assets: ImageAsset[];
  audioUrl?: string;
}

export function Preview({ timeline, assets, audioUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!canvasRef.current) return;
    createRenderer({ canvas: canvasRef.current, timeline, assets }).then((r) => {
      if (!alive) return;
      rendererRef.current = r;
      r.renderAtTime(0);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.destroy();
    };
  }, [timeline, assets]);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
      return;
    }
    startRef.current = performance.now() - offsetRef.current * 1000;
    if (audioRef.current) {
      audioRef.current.currentTime = offsetRef.current;
      audioRef.current.play().catch(() => undefined);
    }
    const loop = () => {
      const t = (performance.now() - startRef.current) / 1000;
      if (t >= timeline.duration) {
        offsetRef.current = 0;
        setTime(0);
        setPlaying(false);
        return;
      }
      offsetRef.current = t;
      setTime(t);
      rendererRef.current?.renderAtTime(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, timeline.duration]);

  const scrub = (v: number) => {
    offsetRef.current = v;
    setTime(v);
    rendererRef.current?.renderAtTime(v);
    if (audioRef.current) audioRef.current.currentTime = v;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-black shadow-elevated">
        <canvas
          ref={canvasRef}
          className="block aspect-video w-full"
          style={{ background: "#000" }}
        />
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground hover:opacity-90"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={() => { setPlaying(false); scrub(0); }}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={0}
          max={timeline.duration}
          step={0.05}
          value={time}
          onChange={(e) => scrub(parseFloat(e.target.value))}
          className="flex-1 accent-[color:var(--accent)]"
        />
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {fmt(time)} / {fmt(timeline.duration)}
        </span>
      </div>
      {audioUrl ? (
        <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />
      ) : null}
    </div>
  );
}

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}
