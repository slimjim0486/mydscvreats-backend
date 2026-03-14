/**
 * Generate logos + cover photos for 3 demo restaurants.
 *
 * Usage:  npx tsx src/scripts/generate-demo-restaurants.ts
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

// ── Demo restaurants ──────────────────────────────────────────

const RESTAURANTS = [
  {
    name: "Zafran House",
    slug: "zafran-house",
    cuisine: "Indian/Pakistani",
    logo: `Create a premium restaurant logo icon for "Zafran House", an upscale Indian-Pakistani restaurant.

<design>
A stylized saffron flower or crocus motif rendered in rich gold (#D4A017) and deep burgundy/maroon tones. Elegant, minimal, modern — not clip-art. Think luxury brand mark.
The design should work as a square icon and feel premium, warm, and inviting.
Clean geometric or semi-organic shape that reads well at 128px and 48px.
</design>

<style>
Modern luxury restaurant branding. Rich warm palette: saffron gold, deep maroon, cream.
Clean background — solid deep maroon or warm cream. No gradients that muddy at small sizes.
Subtle texture or emboss feel is fine. Think Michelin-guide level branding.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No clip art, no cartoons, no Indian flag colors, no stereotypical imagery.
No busy patterns, no paisley, no mandala unless extremely minimal and geometric.
No photorealism — this is a brand mark / logo icon.
</avoid>`,

    cover: `Create a photorealistic cover photo for "Zafran House", a premium Indian-Pakistani restaurant in Dubai.

<subject>
An elegant spread of Indian-Pakistani cuisine on a dark wood or marble surface. Include a rich lamb biryani with saffron rice, a butter chicken in a copper handi, fresh naan bread, and a small bowl of raita. Shot from a 30-degree overhead angle.
</subject>

<photography>
Premium food photography, wide aspect ratio composition (16:9 feel within a square frame — leave breathing room left and right).
Soft warm side lighting, shallow depth of field, rich color grading with warm amber tones.
The scene should feel intimate, luxurious, and atmospheric — like a premium restaurant's website hero image.
Moody but inviting. Dark surface, warm highlights on the food.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh lighting, no flat look, no cafeteria feel.
No steam or vapor.
</avoid>`,
  },
  {
    name: "Vicolo",
    slug: "vicolo",
    cuisine: "Italian",
    logo: `Create a premium restaurant logo icon for "Vicolo", an authentic Italian restaurant.

<design>
A minimal, elegant mark inspired by Italian culinary heritage — perhaps a stylized olive branch, a single wheat stalk, or a simplified arch/doorway motif (vicolo means "alley" in Italian).
Rendered in warm olive green and cream/ivory tones with a touch of terracotta or burnt sienna.
Modern European design sensibility — refined, understated, timeless.
</design>

<style>
Contemporary Italian restaurant branding. Earthy warm palette: olive, cream, terracotta.
Clean background — solid cream or deep olive. Square format, works at 128px and 48px.
Feels like it belongs on a wine label or artisan pasta package. Elegant simplicity.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No Italian flag, no pizza imagery, no chef hats, no checkered tablecloths.
No busy details, no photorealism — clean brand mark only.
No cartoons or clip art.
</avoid>`,

    cover: `Create a photorealistic cover photo for "Vicolo", an authentic Italian restaurant in Dubai.

<subject>
A rustic-elegant Italian dining scene. A handmade pasta dish (perhaps cacio e pepe or fresh pappardelle with ragu) as the hero, alongside a glass of red wine, artisan bread, and a small dish of olive oil. Set on a warm terracotta or aged wood surface with a linen napkin.
</subject>

<photography>
Premium food photography, wide composition with generous negative space for a cover/banner feel.
Soft natural side lighting as if near a window. Warm Mediterranean color grading — golden hour warmth.
Shallow depth of field, the pasta dish sharp, background elements softly blurred.
Rustic but refined — the look of a high-end Italian trattoria, not a chain restaurant.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh lighting, no cool tones, no sterile look.
No steam or vapor.
</avoid>`,
  },
  {
    name: "Jade Garden",
    slug: "jade-garden",
    cuisine: "Chinese/Asian",
    logo: `Create a premium restaurant logo icon for "Jade Garden", an upscale Chinese-Asian restaurant.

<design>
A refined, minimal mark inspired by East Asian aesthetics — perhaps a stylized jade stone, a single lotus blossom, or an elegant brushstroke circle (enso-inspired). Clean and contemporary, not traditional calligraphy.
Rendered in jade green (#5B8C5A or #2E8B57) with gold accents and a dark background (charcoal or deep black-green).
</design>

<style>
Modern luxury Asian restaurant branding. Palette: jade green, gold, deep charcoal.
Square format, clean dark background. Must read well at 128px and 48px.
Feels like a premium dim sum or fine Chinese dining brand — sophisticated, not casual.
Subtle metallic or embossed quality. Think luxury tea packaging or Michelin-starred Asian restaurant.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No dragons, no pagodas, no Chinese characters, no chopsticks, no stereotypical Asian imagery.
No red and yellow, no busy patterns, no cartoons, no clip art.
No photorealism — brand mark only.
</avoid>`,

    cover: `Create a photorealistic cover photo for "Jade Garden", a premium Chinese-Asian restaurant in Dubai.

<subject>
An elegant Chinese dining spread on a dark slate or black lacquer surface. Feature steaming dim sum in bamboo steamers (har gow, siu mai), a Peking duck with pancakes, and a delicate bok choy dish. Small ceramic tea set to the side. Shot from a 35-degree overhead angle.
</subject>

<photography>
Premium food photography, wide composition with cinematic feel.
Dramatic soft lighting — moody and atmospheric with warm golden highlights against a dark setting.
Rich, saturated but natural color. Jade green and gold accents in the props/surface if possible.
Shallow depth of field, hero dishes sharp, edges falling off.
High-end restaurant mood — think luxury hotel Chinese restaurant.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh overhead lighting, no flat look, no takeout container vibes.
No steam or vapor.
</avoid>`,
  },
];

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("Generating demo restaurant images...\n");

  for (const restaurant of RESTAURANTS) {
    console.log(`━━━ ${restaurant.name} (${restaurant.cuisine}) ━━━\n`);

    // Logo
    console.log("  [Logo] Generating...");
    try {
      const logo = await generateImage(restaurant.logo);
      console.log(`  [Logo] Got ${logo.contentType}, uploading...`);
      const uploaded = await uploadBuffer({
        buffer: logo.buffer,
        contentType: logo.contentType,
        key: `demo-restaurants/${restaurant.slug}/logo.${logo.extension}`,
      });
      console.log(`  [Logo] ${uploaded.url}`);
    } catch (err) {
      console.error(`  [Logo] FAILED: ${err instanceof Error ? err.message : err}`);
    }

    // Cover
    console.log("  [Cover] Generating...");
    try {
      const cover = await generateImage(restaurant.cover);
      console.log(`  [Cover] Got ${cover.contentType}, uploading...`);
      const uploaded = await uploadBuffer({
        buffer: cover.buffer,
        contentType: cover.contentType,
        key: `demo-restaurants/${restaurant.slug}/cover.${cover.extension}`,
      });
      console.log(`  [Cover] ${uploaded.url}`);
    } catch (err) {
      console.error(`  [Cover] FAILED: ${err instanceof Error ? err.message : err}`);
    }

    console.log();
  }

  console.log("Done!");
}

main().catch(console.error);
