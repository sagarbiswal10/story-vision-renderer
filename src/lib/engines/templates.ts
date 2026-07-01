/**
 * Template Engine — cinematic editing recipes as data.
 *
 * Templates are JSON. They describe *how* to edit, not *what*.
 * The Director consumes a Template + StoryArc + BeatMap to produce a Timeline.
 *
 * Each template optionally declares `themeKeywords`. The auto-detector scores
 * uploaded images (via their Vision tags/captions) against those keywords and
 * picks the best-matching recipe — e.g. a set of cake / candles / party photos
 * lands on the "Birthday" template automatically.
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
    themeKeywords: ["portrait", "face", "person", "editorial", "cinematic"],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 500 },
    colorGrade: { contrast: 1.08, saturation: 0.85, warmth: 0.25, vignette: 0.35 },
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
    cameraVocabulary: ["push-in", "truck-left", "truck-right", "orbit-left", "ken-burns"],
    transitions: ["whip-pan", "cut", "wipe-up", "cross-dissolve"],
    motionIntensity: 0.85,
    themeKeywords: ["beach", "sun", "summer", "friends", "party", "pool", "ocean"],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 600 },
    colorGrade: { contrast: 1.15, saturation: 1.2, warmth: 0.15, vignette: 0.1 },
    effects: { grain: 0.12, lightLeaks: true, letterbox: false },
  },
  {
    id: "noir-doc",
    name: "Noir Documentary",
    description: "Patient, observational, restrained. Mostly static frames with subtle parallax.",
    mood: "observational, austere, considered",
    baseShotDuration: 5.5,
    beatSync: 0.1,
    cameraVocabulary: ["static", "ken-burns", "tilt-down", "pull-out"],
    transitions: ["fade", "dip-to-black", "cut"],
    motionIntensity: 0.2,
    themeKeywords: ["street", "urban", "documentary", "black and white", "monochrome"],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 400 },
    colorGrade: { contrast: 1.2, saturation: 0.4, warmth: -0.1, vignette: 0.5 },
    effects: { grain: 0.35, lightLeaks: false, letterbox: true },
  },
  {
    id: "birthday",
    name: "Birthday",
    description:
      "Playful, celebratory, confetti-fast. Punchy zooms on candles and reactions, warm party grade.",
    mood: "joyful, festive, warm",
    baseShotDuration: 2.0,
    beatSync: 0.8,
    cameraVocabulary: ["push-in", "orbit-left", "orbit-right", "ken-burns", "truck-right"],
    transitions: ["whip-pan", "cut", "cross-dissolve", "wipe-up"],
    motionIntensity: 0.75,
    themeKeywords: [
      "birthday", "cake", "candle", "candles", "balloon", "balloons",
      "party", "confetti", "gift", "gifts", "celebration", "hat", "frosting",
    ],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 600 },
    colorGrade: { contrast: 1.1, saturation: 1.25, warmth: 0.3, vignette: 0.15 },
    effects: { grain: 0.1, lightLeaks: true, letterbox: false },
  },
  {
    id: "wedding",
    name: "Wedding Film",
    description:
      "Romantic, luminous, patient. Slow pushes, soft cross-dissolves, film-inspired warmth.",
    mood: "romantic, tender, timeless",
    baseShotDuration: 4.0,
    beatSync: 0.4,
    cameraVocabulary: ["push-in", "pull-out", "ken-burns", "tilt-up", "static"],
    transitions: ["cross-dissolve", "fade", "dip-to-black"],
    motionIntensity: 0.4,
    themeKeywords: [
      "wedding", "bride", "groom", "ring", "rings", "veil", "bouquet",
      "ceremony", "altar", "kiss", "vows", "dress", "suit",
    ],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 400 },
    colorGrade: { contrast: 1.05, saturation: 0.95, warmth: 0.3, vignette: 0.3 },
    effects: { grain: 0.18, lightLeaks: true, letterbox: true },
  },
  {
    id: "travel",
    name: "Travel Reel",
    description:
      "Wide vistas, driving pace, bold color. Camera moves match the horizon; cuts on transitions of place.",
    mood: "adventurous, expansive, curious",
    baseShotDuration: 2.4,
    beatSync: 0.85,
    cameraVocabulary: ["truck-left", "truck-right", "push-in", "tilt-up", "orbit-right"],
    transitions: ["whip-pan", "cross-dissolve", "cut", "wipe-right"],
    motionIntensity: 0.8,
    themeKeywords: [
      "travel", "mountain", "mountains", "beach", "city", "skyline",
      "landscape", "sunset", "hike", "airport", "map", "landmark",
    ],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 600 },
    colorGrade: { contrast: 1.15, saturation: 1.15, warmth: 0.1, vignette: 0.2 },
    effects: { grain: 0.12, lightLeaks: false, letterbox: true },
  },
  {
    id: "baby",
    name: "Baby & Family",
    description:
      "Soft, gentle, nostalgic. Long dissolves, tiny Ken-Burns nudges, milky pastel grade.",
    mood: "tender, nostalgic, quiet",
    baseShotDuration: 4.8,
    beatSync: 0.25,
    cameraVocabulary: ["ken-burns", "push-in", "static", "tilt-down"],
    transitions: ["cross-dissolve", "fade", "dip-to-black"],
    motionIntensity: 0.3,
    themeKeywords: [
      "baby", "newborn", "toddler", "child", "family", "mother", "father",
      "crib", "smile", "hands", "feet",
    ],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 400 },
    colorGrade: { contrast: 1.0, saturation: 0.85, warmth: 0.35, vignette: 0.35 },
    effects: { grain: 0.2, lightLeaks: true, letterbox: false },
  },
  {
    id: "product",
    name: "Product Showcase",
    description:
      "Sharp, deliberate, ad-grade. Snap zooms, orbital reveals, crisp neutral grade.",
    mood: "confident, precise, premium",
    baseShotDuration: 1.8,
    beatSync: 0.9,
    cameraVocabulary: ["orbit-left", "orbit-right", "push-in", "pull-out", "static"],
    transitions: ["cut", "whip-pan", "wipe-up", "cross-dissolve"],
    motionIntensity: 0.7,
    themeKeywords: [
      "product", "packaging", "bottle", "shoe", "sneaker", "device",
      "tech", "studio", "flatlay", "still life",
    ],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 600 },
    colorGrade: { contrast: 1.2, saturation: 1.05, warmth: 0.0, vignette: 0.1 },
    effects: { grain: 0.05, lightLeaks: false, letterbox: false },
  },
  {
    id: "food",
    name: "Food Story",
    description:
      "Sensory, hungry, tactile. Slow pushes onto texture, warm rustic grade, unhurried cuts.",
    mood: "warm, sensory, appetizing",
    baseShotDuration: 3.0,
    beatSync: 0.4,
    cameraVocabulary: ["push-in", "ken-burns", "tilt-down", "static"],
    transitions: ["cross-dissolve", "cut", "fade"],
    motionIntensity: 0.45,
    themeKeywords: [
      "food", "meal", "plate", "kitchen", "restaurant", "coffee",
      "cake", "dish", "chef", "table",
    ],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 500 },
    colorGrade: { contrast: 1.1, saturation: 1.1, warmth: 0.3, vignette: 0.25 },
    effects: { grain: 0.15, lightLeaks: false, letterbox: true },
  },
  {
    id: "sports",
    name: "Sports Edit",
    description:
      "Explosive, kinetic, high-contrast. Hard cuts on hits, whip pans, punchy grade.",
    mood: "kinetic, aggressive, triumphant",
    baseShotDuration: 1.3,
    beatSync: 0.98,
    cameraVocabulary: ["push-in", "truck-left", "truck-right", "orbit-right", "orbit-left"],
    transitions: ["cut", "whip-pan", "wipe-right", "wipe-up"],
    motionIntensity: 0.95,
    themeKeywords: [
      "sport", "sports", "run", "running", "ball", "game", "match",
      "stadium", "team", "athlete", "bike", "surf",
    ],
    typography: { titleFont: "Fraunces", bodyFont: "Inter", titleWeight: 700 },
    colorGrade: { contrast: 1.25, saturation: 1.15, warmth: -0.05, vignette: 0.2 },
    effects: { grain: 0.1, lightLeaks: false, letterbox: false },
  },
];

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
