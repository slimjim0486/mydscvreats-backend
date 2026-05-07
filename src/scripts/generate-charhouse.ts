/**
 * Generate logo + cover photo for The Char House test restaurant.
 *
 * Usage:  npx tsx src/scripts/generate-charhouse.ts
 */

import { env } from "@/lib/env";
import { uploadBuffer } from "@/services/r2";

// ── Gemini API call ───────────────────────────────────────────

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
  if (!apiKey) throw new Error("No Gemini API key found");

  const model = env.GOOGLE_IMAGE_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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
    throw new Error(payload?.error?.message ?? `Gemini returned ${response.status}`);
  }

  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) throw new Error("No image data returned");

  const contentType = imagePart.inlineData.mimeType ?? "image/png";
  const ext = contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";

  return { buffer: Buffer.from(imagePart.inlineData.data, "base64"), contentType, extension: ext };
}

// ── Prompts ──────────────────────────────────────────────────

const LOGO_PROMPT = `Create a premium restaurant logo icon for "The Char House", an American grill restaurant known for smash burgers, loaded fries, and craft shakes.

<design>
A bold, striking mark — a stylized flame, grill grate, or charred/branded iron mark. Industrial-meets-craft aesthetic. Rendered in deep charcoal black (#1A1714), ember red/burnt orange (#C8442A), and warm amber/gold (#E8A838).
Strong, confident, slightly rugged but not cheap. Think craft butcher shop meets premium burger joint branding.
Must work as a square icon and read clearly at 128px and 48px.
</design>

<style>
Bold American grill branding. Palette: charcoal black, ember red, warm amber gold.
Dark background (charcoal or black). The mark should feel like it's been seared or stamped — hot iron brand quality.
Masculine but refined — like a premium steakhouse logo, not a fast food chain.
Think artisan burger bar in a hip neighborhood — elevated comfort food branding.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No cartoon burgers, no chef hats, no crossed utensils, no cows.
No American flags, no stars and stripes, no diner aesthetic.
No busy details, no photorealism — clean brand mark only.
No cartoons or clip art. No gradients that muddy at small sizes.
</avoid>`;

const COVER_PROMPT = `Create a photorealistic cover photo for "The Char House", a premium American grill restaurant in Dubai.

<subject>
A dramatic, mouthwatering American grill spread on a dark rustic wood surface. Hero shot: a perfectly stacked double smash burger with melted American cheese dripping down, crispy edges visible, on a brioche bun — slightly deconstructed to show layers. Beside it: a basket of loaded cheese and bacon fries, a thick craft milkshake in a classic glass, and BBQ baby back ribs glistening with glaze. A small ramekin of house sauce. Shot from a 25-degree angle to capture the burger height and cheese drip.
</subject>

<photography>
Premium food photography, wide composition with cinematic feel for a cover/banner image.
Dramatic moody lighting — dark and atmospheric with warm amber/golden highlights that make the food glow. Think fire-lit ambiance.
Rich saturated colors: deep reds on the meat, golden cheese, warm amber tones throughout.
Shallow depth of field, burger hero sharp, other items artfully supporting. Slight smoke haze in the background for atmosphere.
High-end burger restaurant mood — elevated American comfort food, not fast food. Dark, bold, indulgent.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh overhead lighting, no flat look, no cafeteria vibes.
No excessive steam. No bright or clinical look — keep it moody and warm.
</avoid>`;

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("Generating The Char House images...\n");

  // Logo
  console.log("[Logo] Generating...");
  try {
    const logo = await generateImage(LOGO_PROMPT);
    console.log(`[Logo] Got ${logo.contentType}, uploading to R2...`);
    const uploaded = await uploadBuffer({
      buffer: logo.buffer,
      contentType: logo.contentType,
      key: `demo-restaurants/the-char-house/logo.${logo.extension}`,
    });
    console.log(`[Logo] Done: ${uploaded.url}`);
  } catch (err) {
    console.error(`[Logo] FAILED: ${err instanceof Error ? err.message : err}`);
  }

  // Cover
  console.log("\n[Cover] Generating...");
  try {
    const cover = await generateImage(COVER_PROMPT);
    console.log(`[Cover] Got ${cover.contentType}, uploading to R2...`);
    const uploaded = await uploadBuffer({
      buffer: cover.buffer,
      contentType: cover.contentType,
      key: `demo-restaurants/the-char-house/cover.${cover.extension}`,
    });
    console.log(`[Cover] Done: ${uploaded.url}`);
  } catch (err) {
    console.error(`[Cover] FAILED: ${err instanceof Error ? err.message : err}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
