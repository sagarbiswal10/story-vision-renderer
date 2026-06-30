/**
 * Template Engine — cinematic editing recipes as data.
 *
 * Templates are JSON. They describe *how* to edit, not *what*.
 * The Director consumes a Template + StoryArc + BeatMap to produce a Timeline.
 */

import type { Template } from "./types";

export const TEMPLATES: Template[] = [
  {
    id: "a24-portrait",
    name: "A24 Portrait",
    description:
      "Slow, intimate, editorial. Long Ken-Burns pushes, dip-to-black cuts, warm grade.",
    mood: "intimate, contemplative, cinematic",
    baseShotDuration: 4.2,
    beatSync: 0.35,
    cameraVocabulary: ["push-in", "pull-out", "tilt-up", "ken-burns", "static"],
    transitions: ["dip-to-black", "cross-dissolve", "fade"],
    motionIntensity: 0.45,
    typography: {
      titleFont: "Fraunces",
      bodyFont: "Inter",
      titleWeight: 500,
    },
    colorGrade: {
      contrast: 1.08,
      saturation: 0.85,
      warmth: 0.25,
      vignette: 0.35,
    },
    effects: { grain: 0.25, lightLeaks: false, letterbox: true },
  },
  {
    id: "summer-anthem",
    name: "Summer Anthem",
    description:
      "Fast, joyful, beat-locked. Whip pans, sharp cuts on the drop, saturated grade.",
    mood: "euphoric, sun-soaked, energetic",
    baseShotDuration: 1.6,
    beatSync: 0.95,
    cameraVocabulary: [
      "push-in",
      "truck-left",
      "truck-right",
      "orbit-left",
      "ken-burns",
    ],
    transitions: ["whip-pan", "cut", "wipe-up", "cross-dissolve"],
    motionIntensity: 0.85,
    typography: {
      titleFont: "Fraunces",
      bodyFont: "Inter",
      titleWeight: 600,
    },
    colorGrade: {
      contrast: 1.15,
      saturation: 1.2,
      warmth: 0.15,
      vignette: 0.1,
    },
    effects: { grain: 0.12, lightLeaks: true, letterbox: false },
  },
  {
    id: "noir-doc",
    name: "Noir Documentary",
    description:
      "Patient, observational, restrained. Mostly static frames with subtle parallax.",
    mood: "observational, austere, considered",
    baseShotDuration: 5.5,
    beatSync: 0.1,
    cameraVocabulary: ["static", "ken-burns", "tilt-down", "pull-out"],
    transitions: ["fade", "dip-to-black", "cut"],
    motionIntensity: 0.2,
    typography: {
      titleFont: "Fraunces",
      bodyFont: "Inter",
      titleWeight: 400,
    },
    colorGrade: {
      contrast: 1.2,
      saturation: 0.4,
      warmth: -0.1,
      vignette: 0.5,
    },
    effects: { grain: 0.35, lightLeaks: false, letterbox: true },
  },
];

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
