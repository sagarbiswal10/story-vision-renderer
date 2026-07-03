/**
 * AI Director — combines Vision + Story + Template + Beat into a Timeline.
 *
 * This is the local/deterministic director used as a fallback and for fast
 * previews. The Gemini-powered director (src/lib/ai/director.functions.ts)
 * produces a richer StoryArc + per-shot intent; this engine consumes either.
 *
 * Pure function. No rendering, no side effects.
 */

import type {
  BeatMap,
  CameraMove,
  ImageAsset,
  ImageMeta,
  Project,
  Shot,
  StoryArc,
  StoryBeat,
  Template,
  Timeline,
  TransitionKind,
} from "./types";
import { ASPECT_DIMENSIONS } from "./types";
import { cameraToMotion } from "./motion";
import { getTemplate, TEMPLATES } from "./templates";

const FPS = 30;

/**
 * Auto-detect the best template for a batch of tagged images.
 *
 * Scores each template by how many of its `themeKeywords` appear in the
 * combined tag / caption bag of words from Vision Engine metadata. Falls
 * back to the current template id when nothing scores above zero.
 */
export function detectTemplate(
  meta: Record<string, ImageMeta>,
  fallbackId: string,
): { id: string; score: number; matched: string[] } {
  const bag = Object.values(meta)
    .flatMap((m) => [...(m.tags ?? []), (m.caption ?? "").toLowerCase()])
    .join(" ")
    .toLowerCase();
  if (!bag.trim()) return { id: fallbackId, score: 0, matched: [] };

  let best = { id: fallbackId, score: 0, matched: [] as string[] };
  for (const t of TEMPLATES) {
    const kws = t.themeKeywords ?? [];
    const matched = kws.filter((k) => bag.includes(k.toLowerCase()));
    // weight by ratio of matched keywords so short-list templates still win
    const score = matched.length + matched.length / Math.max(1, kws.length);
    if (score > best.score) best = { id: t.id, score, matched };
  }
  return best;
}



/**
 * Build a story arc that fits within a music track's duration by picking the
 * best-scoring assets (heroScore) and letting the template's baseShotDuration
 * dictate rhythm. Cuts will later be beat-snapped in buildTimeline.
 */
export function buildStoryFromMusic(
  assets: ImageAsset[],
  meta: Record<string, ImageMeta>,
  template: Template,
  prompt: string,
  musicDuration: number,
): StoryArc {
  if (!assets.length) return { title: prompt || "Untitled", mood: template.mood, beats: [] };
  const target = Math.max(6, Math.min(musicDuration, 120));
  const base = template.baseShotDuration;
  const capacity = Math.max(3, Math.floor(target / base));

  const ranked = [...assets].sort((a, b) => {
    const ha = meta[a.id]?.heroScore ?? 0.5;
    const hb = meta[b.id]?.heroScore ?? 0.5;
    return hb - ha;
  });
  const picked = ranked.slice(0, Math.min(capacity, assets.length));
  return buildStoryArc(picked, meta, template, prompt);
}

export function buildStoryArc(
  assets: ImageAsset[],
  meta: Record<string, ImageMeta>,
  template: Template,
  prompt: string,
): StoryArc {
  if (assets.length === 0) return { title: prompt || "Untitled", mood: template.mood, beats: [] };

  const scored = assets
    .map((a) => ({ a, m: meta[a.id] ?? defaultMeta(a.id) }))
    .sort((x, y) => y.m.heroScore - x.m.heroScore);

  // Hero image opens, second-hero ends, peak in the middle
  const ordered: typeof scored = [];
  const hero = scored.shift();
  const closer = scored.length > 1 ? scored.pop() : undefined;
  const peak = scored.length > 2 ? scored.shift() : undefined;

  if (hero) ordered.push(hero);
  // Build-up: alternate remaining by emotion contrast
  const rest = [...scored];
  while (rest.length) ordered.push(rest.shift()!);
  if (peak) ordered.splice(Math.floor(ordered.length / 2), 0, peak);
  if (closer) ordered.push(closer);

  const n = ordered.length;
  const beats: StoryBeat[] = ordered.map((entry, i) => {
    const ratio = n === 1 ? 0 : i / (n - 1);
    const act = pickAct(ratio, i, n);
    const duration = shotDurationFor(act, template);
    return {
      act,
      imageId: entry.a.id,
      duration,
      caption: entry.m.caption,
    };
  });

  return {
    title: prompt || "Untitled",
    mood: template.mood,
    beats,
  };
}

function pickAct(ratio: number, i: number, n: number): StoryBeat["act"] {
  if (i === 0) return "opening";
  if (i === n - 1) return "ending";
  if (ratio < 0.35) return "buildup";
  if (ratio > 0.7) return "highlight";
  return "peak";
}

function shotDurationFor(act: StoryBeat["act"], t: Template): number {
  const base = t.baseShotDuration;
  switch (act) {
    case "opening": return base * 1.4;
    case "buildup": return base * 0.9;
    case "highlight": return base * 0.85;
    case "peak": return base * 1.1;
    case "ending": return base * 1.6;
  }
}

/** Snap shot boundaries to nearest beats when beatSync is high. */
function snapToBeat(t: number, beats: number[], strength: number): number {
  if (!beats.length || strength <= 0) return t;
  let best = beats[0];
  let bestDist = Math.abs(beats[0] - t);
  for (const b of beats) {
    const d = Math.abs(b - t);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  // Only snap if within reasonable window
  if (bestDist > 0.6) return t;
  return t + (best - t) * strength;
}

export function buildTimeline(project: Project): Timeline {
  const template = getTemplate(project.templateId);
  const story =
    project.story ??
    buildStoryArc(project.assets, project.meta, template, project.prompt);

  const beatMap = project.music?.beatMap;
  const beats = beatMap?.beats ?? [];
  const camPool: CameraMove[] = template.cameraVocabulary;
  // Skip "cut" so every clip has a real, visible transition in and out.
  const trPool: TransitionKind[] = template.transitions.filter((t) => t !== "cut");
  const trFallback: TransitionKind[] = trPool.length ? trPool : ["cross-dissolve"];

  // Density (0..1) scales both cut frequency and transition length.
  const density = clamp01(project.transitionDensity ?? 0.5);
  const beatsPerCut = beats.length
    ? Math.max(1, Math.round(8 - density * 6)) // dense=2 beats, sparse=8
    : 0;
  const secondsPerBeat = beatMap ? 60 / Math.max(60, beatMap.bpm) : 0;
  const minShot = beatMap ? secondsPerBeat * Math.max(1, beatsPerCut - 1) : 0.8;

  const dims = ASPECT_DIMENSIONS[project.aspect ?? "16:9"];

  // Pre-compute beat-locked cut anchors when music is present.
  const cutAnchors: number[] = [];
  if (beats.length && beatsPerCut > 0) {
    for (let i = 0; i < beats.length; i += beatsPerCut) cutAnchors.push(beats[i]);
    if (beatMap && cutAnchors[cutAnchors.length - 1] < beatMap.duration - 0.5) {
      cutAnchors.push(beatMap.duration);
    }
  }

  let cursor = 0;
  const shots: Shot[] = story.beats.map((sb, idx) => {
    const camera = pickFromPool(camPool, idx);
    const transition = pickFromPool(trFallback, idx);
    const motion = cameraToMotion(camera, template.motionIntensity, idx);

    // Transition length: longer on slow templates, shorter on dense edits.
    const baseXfade = 0.35 + (1 - density) * 0.55; // 0.35..0.9s
    const transitionInDuration = idx === 0 ? Math.min(0.8, baseXfade) : baseXfade;

    let end: number;
    if (cutAnchors.length) {
      // Snap this shot's end to the next available cut anchor.
      const target = cutAnchors.find((t) => t > cursor + minShot) ?? cursor + sb.duration;
      end = target;
    } else {
      end = snapToBeat(cursor + sb.duration, beats, template.beatSync);
    }
    const duration = Math.max(minShot || 0.8, end - cursor);

    const shot: Shot = {
      id: `shot-${idx}`,
      imageId: sb.imageId,
      start: cursor,
      duration,
      camera,
      motion,
      transitionIn: idx === 0 ? "fade" : transition,
      transitionInDuration,
      // Optional title overlay — only if the user explicitly opts in.
      text: undefined,
    };
    cursor += duration;
    return shot;
  });

  return {
    id: project.id,
    width: dims.width,
    height: dims.height,
    fps: FPS,
    duration: cursor,
    shots,
    templateId: template.id,
    music: project.music
      ? { src: project.music.src, startOffset: 0 }
      : undefined,
    colorGrade: template.colorGrade,
    effects: template.effects,
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pickFromPool<T>(pool: T[], idx: number): T {
  return pool[idx % pool.length];
}

function defaultMeta(id: string): ImageMeta {
  return {
    id,
    orientation: "landscape",
    heroScore: 0.5,
    tags: [],
    emotion: "neutral",
  };
}
