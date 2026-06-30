/**
 * Motion Engine — pure math. Computes per-frame transform values.
 *
 * Knows nothing about React, canvas, or assets. Given normalized time t ∈ [0,1]
 * and motion parameters, returns the transform to apply.
 */

import type { CameraMove, MotionParams, Template } from "./types";

const easings = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOut: (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  // Slow start, smooth glide, gentle landing — the Pixar curve
  cinematic: (t: number) => {
    const a = 1 - Math.pow(1 - t, 3);
    const b = t * t * (3 - 2 * t);
    return a * 0.4 + b * 0.6;
  },
} as const;

export function sampleMotion(motion: MotionParams, t: number) {
  const eased = easings[motion.easing](Math.max(0, Math.min(1, t)));
  return {
    scale: lerp(motion.scaleFrom, motion.scaleTo, eased),
    panX: lerp(motion.panFromX, motion.panToX, eased),
    panY: lerp(motion.panFromY, motion.panToY, eased),
    rotate: lerp(motion.rotateFrom, motion.rotateTo, eased),
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Translate a high-level CameraMove into concrete MotionParams. */
export function cameraToMotion(
  camera: CameraMove,
  intensity: number,
  seed = 0,
): MotionParams {
  const i = intensity;
  const drift = (((seed * 9301 + 49297) % 233280) / 233280) * 2 - 1; // -1..1
  const base: MotionParams = {
    scaleFrom: 1,
    scaleTo: 1,
    panFromX: 0,
    panToX: 0,
    panFromY: 0,
    panToY: 0,
    rotateFrom: 0,
    rotateTo: 0,
    easing: "cinematic",
  };

  switch (camera) {
    case "push-in":
      return { ...base, scaleFrom: 1.0, scaleTo: 1.0 + 0.18 * i };
    case "pull-out":
      return { ...base, scaleFrom: 1.0 + 0.2 * i, scaleTo: 1.0 };
    case "orbit-left":
      return {
        ...base,
        scaleFrom: 1.05,
        scaleTo: 1.05,
        panFromX: 0.12 * i,
        panToX: -0.12 * i,
        rotateFrom: 1.5 * i,
        rotateTo: -1.5 * i,
      };
    case "orbit-right":
      return {
        ...base,
        scaleFrom: 1.05,
        scaleTo: 1.05,
        panFromX: -0.12 * i,
        panToX: 0.12 * i,
        rotateFrom: -1.5 * i,
        rotateTo: 1.5 * i,
      };
    case "tilt-up":
      return { ...base, scaleFrom: 1.08, scaleTo: 1.08, panFromY: 0.18 * i, panToY: -0.18 * i };
    case "tilt-down":
      return { ...base, scaleFrom: 1.08, scaleTo: 1.08, panFromY: -0.18 * i, panToY: 0.18 * i };
    case "truck-left":
      return { ...base, scaleFrom: 1.08, scaleTo: 1.08, panFromX: 0.2 * i, panToX: -0.2 * i };
    case "truck-right":
      return { ...base, scaleFrom: 1.08, scaleTo: 1.08, panFromX: -0.2 * i, panToX: 0.2 * i };
    case "ken-burns":
      return {
        ...base,
        scaleFrom: 1.0 + 0.05 * i,
        scaleTo: 1.0 + 0.22 * i,
        panFromX: 0.05 * i * drift,
        panToX: -0.05 * i * drift,
        panFromY: -0.04 * i,
        panToY: 0.04 * i,
      };
    case "static":
    default:
      return { ...base, scaleFrom: 1.02, scaleTo: 1.02 };
  }
}

export function colorGradeFilter(grade: Template["colorGrade"]): string {
  const warmthHue = grade.warmth >= 0 ? 0 : 200;
  const warmthAmount = Math.abs(grade.warmth) * 25;
  return [
    `contrast(${grade.contrast})`,
    `saturate(${grade.saturation})`,
    warmthAmount > 0 ? `hue-rotate(${warmthHue === 0 ? warmthAmount : -warmthAmount}deg)` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
