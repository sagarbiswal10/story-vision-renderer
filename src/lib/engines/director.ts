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
import { cameraToMotion } from "./motion";
import { getTemplate, TEMPLATES } from "./templates";

const ASPECT = { width: 1920, height: 1080, fps: 30 };

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

  const beats = project.music?.beatMap?.beats ?? [];
  const camPool: CameraMove[] = template.cameraVocabulary;
  const trPool: TransitionKind[] = template.transitions;

  let cursor = 0;
  const shots: Shot[] = story.beats.map((sb, idx) => {
    const camera = pickFromPool(camPool, idx);
    const transition = pickFromPool(trPool, idx);
    const motion = cameraToMotion(camera, template.motionIntensity, idx);
    const transitionInDuration = transition === "cut" ? 0 : 0.45;

    const rawDuration = sb.duration;
    const rawEnd = cursor + rawDuration;
    const snappedEnd = snapToBeat(rawEnd, beats, template.beatSync);
    const duration = Math.max(0.8, snappedEnd - cursor);

    const shot: Shot = {
      id: `shot-${idx}`,
      imageId: sb.imageId,
      start: cursor,
      duration,
      camera,
      motion,
      transitionIn: idx === 0 ? "fade" : transition,
      transitionInDuration,
      text:
        idx === 0 && story.title
          ? {
              text: story.title,
              fontFamily: template.typography.titleFont,
              size: 88,
              weight: template.typography.titleWeight,
              align: "left",
              position: { x: 0.08, y: 0.78 },
              in: 0.4,
              out: Math.min(duration - 0.2, 3.4),
            }
          : undefined,
    };
    cursor += duration;
    return shot;
  });

  return {
    id: project.id,
    width: ASPECT.width,
    height: ASPECT.height,
    fps: ASPECT.fps,
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
