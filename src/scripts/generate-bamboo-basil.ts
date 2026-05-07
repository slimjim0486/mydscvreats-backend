/**
 * Generate logo + cover photo for Bamboo & Basil test restaurant.
 *
 * Usage:  npx tsx src/scripts/generate-bamboo-basil.ts
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

const LOGO_PROMPT = `Create a premium restaurant logo icon for "Bamboo & Basil", a modern Asian fusion restaurant.

<design>
A stylized mark that fuses two elements: a single bamboo stalk or leaf and a basil leaf, intertwined or overlapping into one cohesive symbol. Rendered in deep forest green (#2D5A27) and warm gold (#C8A951) on a clean dark background (charcoal #1A1A1A or deep green-black).
Modern, minimal, geometric but with an organic touch. Think premium brand mark — refined, not playful.
Must work as a square icon and read clearly at 128px and 48px.
</design>

<style>
Contemporary Asian fusion restaurant branding. Palette: forest green, warm gold, charcoal.
Feels like a premium restaurant in a design-forward neighborhood — sophisticated, fresh, modern.
Subtle metallic or embossed quality on the gold elements. Clean dark background.
Think luxury tea brand meets Michelin-starred fusion restaurant identity.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No chopsticks, no wok, no noodles, no stereotypical Asian imagery.
No dragons, no Chinese characters, no pagodas.
No busy patterns, no photorealism — clean brand mark only.
No cartoons or clip art. No gradients that muddy at small sizes.
</avoid>`;

const COVER_PROMPT = `Create a photorealistic cover photo for "Bamboo & Basil", a modern Asian fusion restaurant in Dubai.

<subject>
A stunning Asian fusion dining spread on a dark slate surface with natural bamboo accents. Feature a beautifully plated teriyaki salmon bowl with vibrant colors, alongside crispy shrimp tempura, fresh Thai basil spring rolls, and a matcha panna cotta dessert. Small ceramic cups of green tea. Scattered fresh Thai basil leaves and lime wedges as styling props. Shot from a 30-degree overhead angle.
</subject>

<photography>
Premium food photography, wide composition with cinematic feel and generous negative space for a banner/cover image.
Dramatic soft side lighting — moody and atmospheric with warm golden highlights against a dark setting.
Rich, saturated but natural colors. Vibrant greens from herbs, warm amber tones on proteins, clean whites on ceramics.
Shallow depth of field, hero dish (salmon bowl) sharp and centered, other dishes artfully arranged around it with soft focus.
High-end restaurant mood — think design-forward Asian fusion restaurant in Dubai. Modern, fresh, elevated street food made elegant.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh overhead lighting, no flat look, no takeout container vibes.
No steam or vapor. No cluttered composition.
</avoid>`;

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("Generating Bamboo & Basil images...\n");

  // Logo
  console.log("[Logo] Generating...");
  try {
    const logo = await generateImage(LOGO_PROMPT);
    console.log(`[Logo] Got ${logo.contentType}, uploading to R2...`);
    const uploaded = await uploadBuffer({
      buffer: logo.buffer,
      contentType: logo.contentType,
      key: `demo-restaurants/bamboo-basil/logo.${logo.extension}`,
    });
    console.log(`[Logo] ✓ ${uploaded.url}`);
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
      key: `demo-restaurants/bamboo-basil/cover.${cover.extension}`,
    });
    console.log(`[Cover] ✓ ${uploaded.url}`);
  } catch (err) {
    console.error(`[Cover] FAILED: ${err instanceof Error ? err.message : err}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
