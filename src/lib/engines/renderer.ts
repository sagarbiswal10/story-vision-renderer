/**
 * Renderer — frame-accurate canvas renderer for a Timeline.
 *
 * Knows nothing about AI or story. Pure execution layer.
 *
 *   const r = await createRenderer({ canvas, timeline, assets });
 *   r.renderAtTime(2.4); // draws frame at t=2.4s
 *
 * Used by both:
 *   - Studio Preview (RAF playback loop)
 *   - Export (MediaRecorder draws each frame at fps cadence)
 */

import type { ImageAsset, Shot, Timeline } from "./types";
import { sampleMotion, colorGradeFilter } from "./motion";

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  timeline: Timeline;
  assets: ImageAsset[];
}

export interface Renderer {
  renderAtTime: (time: number) => void;
  destroy: () => void;
  ready: Promise<void>;
}

export async function createRenderer(opts: RendererOptions): Promise<Renderer> {
  const { canvas, timeline, assets } = opts;
  canvas.width = timeline.width;
  canvas.height = timeline.height;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    assets.map(
      (a) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            images.set(a.id, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = a.src;
        }),
    ),
  );

  function findShot(time: number): { shot: Shot; t: number } | null {
    for (const s of timeline.shots) {
      if (time >= s.start && time < s.start + s.duration) {
        return { shot: s, t: (time - s.start) / s.duration };
      }
    }
    const last = timeline.shots[timeline.shots.length - 1];
    if (last && time >= last.start)
      return { shot: last, t: 1 };
    return null;
  }

  function drawShot(shot: Shot, t: number, alpha = 1) {
    const img = images.get(shot.imageId);
    if (!img || img.naturalWidth === 0) {
      ctx.fillStyle = "#0F0E0C";
      ctx.fillRect(0, 0, timeline.width, timeline.height);
      return;
    }

    const m = sampleMotion(shot.motion, t);
    const W = timeline.width;
    const H = timeline.height;

    // Cover-fit, then over-scan for camera headroom
    const overscan = 1.18;
    const baseScale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * overscan;
    const scale = baseScale * m.scale;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    const headroomX = (drawW - W) / 2;
    const headroomY = (drawH - H) / 2;
    const dx = (W - drawW) / 2 + m.panX * headroomX;
    const dy = (H - drawH) / 2 + m.panY * headroomY;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = colorGradeFilter(timeline.colorGrade);
    if (m.rotate !== 0) {
      ctx.translate(W / 2, H / 2);
      ctx.rotate((m.rotate * Math.PI) / 180);
      ctx.translate(-W / 2, -H / 2);
    }
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();

    // Text overlay
    if (shot.text) {
      const absT = t * shot.duration;
      if (absT >= shot.text.in && absT <= shot.text.out) {
        const fade = Math.min(
          1,
          Math.min(absT - shot.text.in, shot.text.out - absT) / 0.45,
        );
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.fillStyle = "#E8E2D5";
        ctx.font = `${shot.text.weight} ${shot.text.size}px ${shot.text.fontFamily}, serif`;
        ctx.textAlign = shot.text.align;
        ctx.textBaseline = "alphabetic";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 24;
        ctx.fillText(
          shot.text.text,
          shot.text.position.x * W,
          shot.text.position.y * H,
        );
        ctx.restore();
      }
    }
  }

  function drawVignette() {
    const v = timeline.colorGrade.vignette;
    if (v <= 0) return;
    const grad = ctx.createRadialGradient(
      timeline.width / 2,
      timeline.height / 2,
      timeline.height * 0.35,
      timeline.width / 2,
      timeline.height / 2,
      timeline.height * 0.85,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${v * 0.8})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, timeline.width, timeline.height);
  }

  function drawLetterbox() {
    if (!timeline.effects.letterbox) return;
    const bar = timeline.height * 0.075;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, timeline.width, bar);
    ctx.fillRect(0, timeline.height - bar, timeline.width, bar);
  }

  function renderAtTime(time: number) {
    ctx.fillStyle = "#0F0E0C";
    ctx.fillRect(0, 0, timeline.width, timeline.height);

    const cur = findShot(time);
    if (!cur) return;

    // Outgoing tail of previous shot (cross-dissolve / fade)
    const idx = timeline.shots.indexOf(cur.shot);
    const next = timeline.shots[idx + 1];
    drawShot(cur.shot, cur.t, 1);

    if (next) {
      const overlap = next.transitionInDuration;
      const timeUntilNext = cur.shot.start + cur.shot.duration - time;
      if (overlap > 0 && timeUntilNext <= overlap) {
        const a = 1 - timeUntilNext / overlap;
        drawShot(next, 0, a);
      }
    }

    drawVignette();
    drawLetterbox();
  }

  return {
    renderAtTime,
    destroy: () => images.clear(),
    ready: Promise.resolve(),
  };
}
