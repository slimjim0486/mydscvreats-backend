/**
 * Generate 3 AI chef avatar variations using the same Gemini image gen service.
 *
 * Usage:  npx tsx src/scripts/generate-chef-avatars.ts
 */

import { env } from "@/lib/env";
import { uploadBuffer, buildObjectUrl } from "@/services/r2";

// ── Gemini API call (same pattern as google-image.ts) ─────────

interface GoogleImageResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }[];
    };
  }[];
  error?: { message?: string };
}

async function generateImage(prompt: string) {
  const apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? env.NANOBANANA_API_KEY;
  if (!apiKey) {
    throw new Error("No Gemini API key found in env");
  }

  const model = env.GOOGLE_IMAGE_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log(`  Calling ${model}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const payload = (await response.json().catch(() => null)) as GoogleImageResponse | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? `Gemini returned ${response.status}`
    );
  }

  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini returned no image data");
  }

  const contentType = imagePart.inlineData.mimeType ?? "image/png";
  const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";

  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    contentType,
    extension: ext,
  };
}

// ── Avatar prompts ────────────────────────────────────────────

const VARIATIONS: { name: string; filename: string; prompt: string }[] = [
  {
    name: "Classic Warmth",
    filename: "chef-avatar-classic",
    prompt: `Create a single character portrait illustration for a small circular app avatar icon.

<subject>
A friendly, warm AI chef character. Shoulders-up bust portrait, centered in frame.
Classic white chef's toque (hat), clean white chef coat. Warm genuine smile, kind eyes, approachable expression — like a trusted chef about to recommend their favorite dish.
</subject>

<style>
Modern digital illustration with subtle 3D depth — NOT photographic, NOT cartoonish.
Think premium app icon or Pixar-inspired character design: soft shading, clean rendering, expressive but refined.
Warm golden ambient lighting in the #E8A317 / amber range. Background is a clean soft warm gradient (golden cream to warm amber), blurred and minimal.
</style>

<composition>
Square frame, face perfectly centered, designed to be cropped into a circle at 56-112px display size.
The character must read clearly and feel inviting even at thumbnail size. Keep details on the face, simplify everything else.
Large head-to-frame ratio — the face fills most of the square.
</composition>

<avoid>
No text, logos, watermarks, food items in frame, hands, props, utensils, or kitchen backgrounds.
No photorealism, no uncanny valley, no generic stock-art feel.
No harsh shadows, no cool/blue tones.
</avoid>`,
  },
  {
    name: "Modern Edge",
    filename: "chef-avatar-modern",
    prompt: `Create a single character portrait illustration for a small circular app avatar icon.

<subject>
A stylish, contemporary AI chef character. Shoulders-up bust portrait, centered.
No traditional chef hat — instead a clean dark apron over a modern outfit, or a subtle headband/bandana. Confident yet welcoming half-smile, sharp but warm eyes. Feels like a modern food-tech guide, not old-school.
</subject>

<style>
Sleek digital illustration, modern and clean with a hint of 3D rendering depth.
Think Apple Memoji quality meets editorial illustration: polished, distinctive, contemporary.
Rich warm lighting with golden-amber highlights (#E8A317). Background is a deep warm tone (charcoal-brown or dark espresso) with a subtle warm glow behind the character, creating contrast.
</style>

<composition>
Square frame, face perfectly centered, designed for circular crop at 56-112px.
High head-to-frame ratio. Must be instantly readable as a friendly chef character even at tiny sizes.
Clean silhouette against the dark background.
</composition>

<avoid>
No text, logos, watermarks, food, hands, props, utensils, or kitchen scenes.
No cartoonish proportions, no anime style, no generic clip-art feel.
No cool blue tones, no flat design, no harsh edges.
</avoid>`,
  },
  {
    name: "Friendly Guide",
    filename: "chef-avatar-friendly",
    prompt: `Create a single character portrait illustration for a small circular app avatar icon.

<subject>
A charming, inviting AI food guide character. Shoulders-up bust portrait, centered.
Wearing a casual chef's jacket or linen apron, with a small chef's toque tilted at a slight jaunty angle. Big warm smile, bright expressive eyes, slightly raised eyebrow — as if about to say "you'll love this dish."
The character radiates enthusiasm and warmth.
</subject>

<style>
Warm, polished illustration style with soft painterly rendering and gentle 3D volume.
Think animated film character portrait: expressive, appealing, distinctive personality.
Warm golden lighting palette (#E8A317 amber tones), soft highlights on the face. Background is a creamy warm gradient with soft bokeh-like warmth, minimal and clean.
</style>

<composition>
Square frame, face perfectly centered for circular avatar crop at 56-112px.
Large face ratio filling the frame. Expression and personality must come through even at small sizes.
Slightly more dynamic pose than a straight-on mugshot — subtle head tilt or slight turn adds life.
</composition>

<avoid>
No text, logos, watermarks, food items, hands, props, utensils, or backgrounds with detail.
No photorealism, no stiff/corporate feel, no generic AI avatar look.
No cool tones, no dark moody palette, no flat design.
</avoid>`,
  },
];

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("Generating 3 AI chef avatar variations...\n");

  const results: { name: string; url: string }[] = [];

  for (const variation of VARIATIONS) {
    console.log(`[${variation.name}]`);

    try {
      const image = await generateImage(variation.prompt);
      console.log(`  Generated (${image.contentType}), uploading to R2...`);

      const uploaded = await uploadBuffer({
        buffer: image.buffer,
        contentType: image.contentType,
        key: `assets/chef-avatars/${variation.filename}.${image.extension}`,
      });

      console.log(`  Uploaded: ${uploaded.url}\n`);
      results.push({ name: variation.name, url: uploaded.url });
    } catch (error) {
      console.error(
        `  FAILED: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  console.log("━".repeat(50));
  console.log("Results:\n");

  for (const result of results) {
    console.log(`  ${result.name}`);
    console.log(`  ${result.url}\n`);
  }

  if (results.length === 0) {
    console.log("  No avatars generated. Check API keys and try again.");
  }
}

main().catch(console.error);
