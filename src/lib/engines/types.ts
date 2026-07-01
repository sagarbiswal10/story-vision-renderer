/**
 * Core types for the Cinematic Video Studio engines.
 *
 * Every engine is independent. Engines exchange data through these
 * structured JSON shapes — no engine knows about another's internals.
 *
 *   Vision  → ImageMeta[]
 *   Beat    → BeatMap
 *   Story   → StoryArc
 *   Director (Story + Template + Beat + ImageMeta) → Timeline
 *   Renderer (Timeline + assets) → frames / MP4
 */

export type Orientation = "portrait" | "landscape" | "square";

export interface ImageAsset {
  id: string;
  /** dataURL or object URL — opaque to engines */
  src: string;
  width: number;
  height: number;
  /** filename for display */
  name: string;
}

export interface ImageMeta {
  id: string;
  orientation: Orientation;
  /** 0..1 — director uses to choose hero/highlight slots */
  heroScore: number;
  /** Director-relevant tags returned by Vision Engine */
  tags: string[];
  emotion?:
    | "joy"
    | "calm"
    | "wonder"
    | "melancholy"
    | "energy"
    | "intimacy"
    | "neutral";
  dominantColor?: string;
  /** Free-form caption from the vision model */
  caption?: string;
}

export interface BeatMap {
  bpm: number;
  /** Beat timestamps in seconds */
  beats: number[];
  /** Higher-energy moments — drops, choruses */
  accents: number[];
  /** Total music duration in seconds */
  duration: number;
}

export type StoryAct =
  | "opening"
  | "buildup"
  | "highlight"
  | "peak"
  | "ending";

export interface StoryBeat {
  act: StoryAct;
  imageId: string;
  /** seconds */
  duration: number;
  caption?: string;
}

export interface StoryArc {
  title: string;
  mood: string;
  beats: StoryBeat[];
}

/* ===== Motion / Camera primitives ===== */

export type CameraMove =
  | "static"
  | "push-in"
  | "pull-out"
  | "orbit-left"
  | "orbit-right"
  | "tilt-up"
  | "tilt-down"
  | "truck-left"
  | "truck-right"
  | "ken-burns";

export type TransitionKind =
  | "cut"
  | "fade"
  | "dip-to-black"
  | "whip-pan"
  | "cross-dissolve"
  | "wipe-up"
  | "wipe-right";

export interface MotionParams {
  /** 0..1 — start scale */
  scaleFrom: number;
  scaleTo: number;
  /** -1..1 — horizontal pan as fraction of overscan */
  panFromX: number;
  panToX: number;
  panFromY: number;
  panToY: number;
  /** degrees */
  rotateFrom: number;
  rotateTo: number;
  /** cubic-bezier easing name */
  easing: "linear" | "easeOut" | "easeIn" | "easeInOut" | "cinematic";
}

/* ===== Template (cinematic recipe) ===== */

export interface Template {
  id: string;
  name: string;
  description: string;
  mood: string;
  /** preferred seconds per shot at default tempo */
  baseShotDuration: number;
  /** how strongly to lock cuts to beats: 0..1 */
  beatSync: number;
  cameraVocabulary: CameraMove[];
  transitions: TransitionKind[];
  motionIntensity: number; // 0..1
  /** Keywords used by the auto-detector to match a set of images to a template. */
  themeKeywords?: string[];
  typography: {
    titleFont: string;
    bodyFont: string;
    titleWeight: number;
  };
  colorGrade: {
    contrast: number; // 0..2
    saturation: number; // 0..2
    warmth: number; // -1..1
    vignette: number; // 0..1
  };
  effects: {
    grain: number;
    lightLeaks: boolean;
    letterbox: boolean;
  };
}

/* ===== Timeline (renderer input) ===== */

export interface TextOverlay {
  text: string;
  fontFamily: string;
  size: number; // px at 1080p
  weight: number;
  align: "left" | "center" | "right";
  position: { x: number; y: number }; // 0..1
  in: number; // seconds from shot start
  out: number;
}

export interface Shot {
  id: string;
  imageId: string;
  start: number; // seconds from timeline start
  duration: number;
  camera: CameraMove;
  motion: MotionParams;
  transitionIn: TransitionKind;
  transitionInDuration: number;
  text?: TextOverlay;
}

export interface Timeline {
  id: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  shots: Shot[];
  templateId: string;
  music?: { src: string; startOffset: number };
  colorGrade: Template["colorGrade"];
  effects: Template["effects"];
}

/* ===== Project (persisted) ===== */

export type RenderStatus = "idle" | "queued" | "rendering" | "done" | "error";

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  prompt: string;
  assets: ImageAsset[];
  meta: Record<string, ImageMeta>;
  music?: { src: string; name: string; beatMap?: BeatMap };
  story?: StoryArc;
  timeline?: Timeline;
  render: {
    status: RenderStatus;
    progress: number;
    outputUrl?: string;
    error?: string;
  };
}
