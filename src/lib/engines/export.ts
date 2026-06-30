/**
 * Export Engine — turns an in-browser canvas + Renderer into an MP4/WebM file.
 *
 * Uses MediaRecorder to capture the canvas stream at the timeline fps.
 * For true server-side Remotion rendering, swap this module's implementation
 * for a fetch call to an external render worker — the rest of the studio
 * doesn't need to change.
 */

import type { Renderer } from "./renderer";
import type { Timeline } from "./types";

export interface ExportOptions {
  renderer: Renderer;
  canvas: HTMLCanvasElement;
  timeline: Timeline;
  audioElement?: HTMLAudioElement;
  onProgress?: (pct: number) => void;
}

export async function exportVideo(opts: ExportOptions): Promise<Blob> {
  const { renderer, canvas, timeline, audioElement, onProgress } = opts;
  const fps = timeline.fps;
  const stream = canvas.captureStream(fps);

  if (audioElement) {
    try {
      const audioCtx = new AudioContext();
      const src = audioCtx.createMediaElementSource(audioElement);
      const dest = audioCtx.createMediaStreamDestination();
      src.connect(dest);
      src.connect(audioCtx.destination);
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      /* track already connected — ignore */
    }
  }

  const mimeCandidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mimeType =
    mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e) => reject(e);
    recorder.start();

    const start = performance.now();
    if (audioElement) {
      audioElement.currentTime = 0;
      audioElement.play().catch(() => undefined);
    }

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      renderer.renderAtTime(elapsed);
      onProgress?.(Math.min(1, elapsed / timeline.duration));
      if (elapsed >= timeline.duration) {
        if (audioElement) audioElement.pause();
        recorder.stop();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
