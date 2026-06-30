/**
 * Beat Engine — analyzes an audio file in-browser to extract BPM + beat times.
 *
 * Uses a simple energy-onset + autocorrelation approach. Returns a BeatMap.
 * This is intentionally lightweight; swap for a model-based detector later.
 */

import type { BeatMap } from "./types";

export async function analyzeAudio(src: string): Promise<BeatMap> {
  const res = await fetch(src);
  const buf = await res.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 44100 * 2, 44100);
  const audio = await ctx.decodeAudioData(buf.slice(0));
  const data = audio.getChannelData(0);
  const sr = audio.sampleRate;
  const duration = audio.duration;

  // Compute energy envelope at 100 Hz
  const hop = Math.floor(sr / 100);
  const energy: number[] = [];
  for (let i = 0; i < data.length; i += hop) {
    let sum = 0;
    const end = Math.min(i + hop, data.length);
    for (let j = i; j < end; j++) sum += data[j] * data[j];
    energy.push(Math.sqrt(sum / (end - i)));
  }

  // Onset = positive derivative thresholded above local mean
  const onsets: number[] = [];
  const win = 20;
  for (let i = 1; i < energy.length; i++) {
    const a = energy[i];
    const b = energy[i - 1];
    if (a - b <= 0) continue;
    let m = 0;
    const s = Math.max(0, i - win);
    for (let k = s; k < i; k++) m += energy[k];
    m /= i - s;
    if (a > m * 1.4) onsets.push(i / 100);
  }

  // Estimate BPM via inter-onset interval histogram
  let bpm = 110;
  if (onsets.length > 8) {
    const bins = new Array(200).fill(0);
    for (let i = 1; i < onsets.length; i++) {
      const ioi = onsets[i] - onsets[i - 1];
      if (ioi < 0.25 || ioi > 1.2) continue;
      const candidate = 60 / ioi;
      const idx = Math.round(candidate);
      if (idx >= 40 && idx < 200) bins[idx] += 1;
    }
    let best = 0;
    bins.forEach((v, idx) => {
      if (v > best) { best = v; bpm = idx; }
    });
  }

  // Build evenly-spaced beats locked to first onset
  const interval = 60 / bpm;
  const start = onsets[0] ?? 0;
  const beats: number[] = [];
  for (let t = start; t < duration; t += interval) beats.push(+t.toFixed(3));

  // Accents = every 4th beat (downbeats) or onsets in top 20% energy
  const accents: number[] = beats.filter((_, i) => i % 4 === 0);

  return { bpm, beats, accents, duration };
}
