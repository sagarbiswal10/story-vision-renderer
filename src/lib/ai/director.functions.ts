/**
 * AI Director — server functions that wrap Lovable AI Gateway (Gemini).
 *
 *   tagImages       — Vision Engine: per-image metadata
 *   directStory     — Story Engine: structured StoryArc from prompt + meta
 *
 * Both return structured JSON. Neither renders pixels.
 */

import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";
import type { ImageMeta, StoryArc } from "../engines/types";

const TagInput = z.object({
  images: z
    .array(
      z.object({
        id: z.string(),
        src: z.string(), // dataURL or https URL
      }),
    )
    .min(1)
    .max(20),
});

const TagSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      heroScore: z.number().min(0).max(1),
      orientation: z.enum(["portrait", "landscape", "square"]),
      tags: z.array(z.string()),
      emotion: z.enum([
        "joy",
        "calm",
        "wonder",
        "melancholy",
        "energy",
        "intimacy",
        "neutral",
      ]),
      caption: z.string(),
    }),
  ),
});

export const tagImages = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TagInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: TagSchema }),
      messages: [
        {
          role: "system",
          content:
            "You are a film editor's assistant. For each image, return cinematic metadata: heroScore (0..1, how strong/iconic the frame is), orientation, 3-6 lowercase tags, dominant emotion, and a one-sentence caption written like a film editor's note.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Tag these ${data.images.length} images. Return them in the exact same order, matching the id field.`,
            },
            ...data.images.flatMap((img) => [
              { type: "text" as const, text: `id: ${img.id}` },
              { type: "image_url" as const, image_url: { url: img.src } },
            ]),
          ],
        },
      ],
    });

    const meta: Record<string, ImageMeta> = {};
    for (const r of output.results) {
      meta[r.id] = {
        id: r.id,
        orientation: r.orientation,
        heroScore: r.heroScore,
        tags: r.tags,
        emotion: r.emotion,
        caption: r.caption,
      };
    }
    return meta;
  });

const StoryInput = z.object({
  prompt: z.string(),
  mood: z.string(),
  meta: z.array(
    z.object({
      id: z.string(),
      caption: z.string().nullable(),
      emotion: z.string().nullable(),
      heroScore: z.number(),
    }),
  ),
  baseShotDuration: z.number(),
});

const StorySchema = z.object({
  title: z.string(),
  mood: z.string(),
  beats: z.array(
    z.object({
      act: z.enum(["opening", "buildup", "highlight", "peak", "ending"]),
      imageId: z.string(),
      duration: z.number().min(0.6).max(12),
      caption: z.string(),
    }),
  ),
});

export const directStory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => StoryInput.parse(data))
  .handler(async ({ data }): Promise<StoryArc> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: StorySchema }),
      messages: [
        {
          role: "system",
          content:
            "You are a senior film editor. Given image notes, write a 5-act cinematic edit (opening → buildup → highlight → peak → ending). Order every image exactly once. Pick durations that feel like a real edit; respect the requested mood. Return JSON only.",
        },
        {
          role: "user",
          content: `Mood: ${data.mood}\nUser prompt: ${data.prompt}\nBase shot duration: ${data.baseShotDuration}s\nImages:\n${data.meta
            .map(
              (m) =>
                `- ${m.id} | hero=${m.heroScore.toFixed(2)} | emotion=${m.emotion ?? "?"} | ${m.caption ?? ""}`,
            )
            .join("\n")}`,
        },
      ],
    });

    return output;
  });
