/**
 * Generate logos + cover photos for Levant Grill, Sweet Spot Desserts, and Bao & Bowl.
 *
 * Usage:  npx tsx src/scripts/generate-explore-restaurants.ts
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

// ── Restaurant prompts ──────────────────────────────────────────

const RESTAURANTS = [
  {
    name: "Levant Grill",
    slug: "levant-grill",
    cuisine: "Lebanese",
    logo: `Create a premium restaurant logo icon for "Levant Grill", an authentic Lebanese grill and mezze restaurant.

<design>
A stylized mark inspired by Levantine heritage — perhaps a graceful cedar tree silhouette, a single olive branch arc, or an abstract flame motif suggesting charcoal grilling. Rendered in warm earth tones: burnt terracotta (#C65D3E), antique gold (#B8860B), and warm ivory on a deep charcoal (#1E1E1E) background.
Modern, minimal, refined. The mark should feel timeless and warm — like a premium Middle Eastern restaurant brand.
Must work as a square icon and read clearly at 128px and 48px.
</design>

<style>
Contemporary Middle Eastern restaurant branding. Palette: terracotta, antique gold, deep charcoal.
Feels like a premium boutique Lebanese restaurant — warm, inviting, deeply rooted in heritage but contemporary.
Subtle embossed or metallic quality on the gold elements. Clean dark background.
Think high-end Lebanese restaurant in a design-forward Dubai neighbourhood.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No flags, no hookah, no fez, no stereotypical Middle Eastern clichés.
No busy geometric Islamic patterns — keep it minimal and modern.
No photorealism, no cartoons, no clip art.
No gradients that muddy at small sizes.
</avoid>`,

    cover: `Create a photorealistic cover photo for "Levant Grill", an authentic Lebanese restaurant in Dubai.

<subject>
A stunning Lebanese mezze and grill spread on a warm stone or dark wood surface. Feature a charcoal-grilled mixed grill platter (lamb kofta, shish tawook, lamb chops) as the hero, surrounded by classic mezze: creamy hummus with olive oil drizzle and paprika, smoky baba ganoush, colourful fattoush salad, warm flatbread, and pickled turnips. Small dishes of garlic toum and tahini. Fresh mint leaves, sumac, and pomegranate seeds as styling accents. Shot from a 30-degree overhead angle.
</subject>

<photography>
Premium food photography, wide composition with cinematic feel and generous negative space for a banner/cover image.
Warm, atmospheric side lighting — golden hour warmth with soft shadows. Rich, saturated but natural colours.
The grilled meats should have visible char marks and look succulent. The mezze should look fresh, vibrant, and inviting.
Shallow depth of field, hero dish sharp, other dishes artfully arranged with soft edges.
High-end restaurant mood — think premium Lebanese grill in Dubai. Warm, generous, convivial.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh overhead lighting, no flat look, no cafeteria vibes.
No steam or vapor. No cluttered composition.
</avoid>`,
  },
  {
    name: "Sweet Spot Desserts",
    slug: "sweet-spot-desserts",
    cuisine: "Desserts & Bakery",
    logo: `Create a premium bakery/dessert shop logo icon for "Sweet Spot Desserts", an artisanal dessert and bakery brand.

<design>
A stylized mark that evokes indulgence and artisanal craft — perhaps a single elegant macaron silhouette, a delicate whisk curl, or an abstract confection shape. Rendered in warm rose pink (#D4788C), cream (#FFF5E6), and soft gold (#D4A76A) on a clean background (soft blush or warm white).
Modern, feminine, elegant — think premium patisserie branding. Refined, not cute or cartoonish.
Must work as a square icon and read clearly at 128px and 48px.
</design>

<style>
Contemporary artisanal bakery branding. Palette: rose pink, cream, soft gold.
Feels like a premium patisserie or dessert boutique — elegant, sophisticated, inviting.
Light and airy aesthetic with a touch of warmth. Clean, minimal background.
Think Ladurée meets modern Dubai — refined, aspirational, beautiful.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No cupcakes with faces, no generic cake icons, no sprinkles or cartoon candy.
No busy patterns, no rainbow colours, no childish design elements.
No photorealism — brand mark only.
No dark or heavy colour schemes — keep it light and elegant.
</avoid>`,

    cover: `Create a photorealistic cover photo for "Sweet Spot Desserts", a premium artisanal dessert and bakery shop in Dubai.

<subject>
A luxurious dessert display on a marble or light stone surface with soft linen accents. Feature a stunning pistachio kunafa cheesecake as the hero, alongside a row of colourful French macarons, a rich chocolate fondant with a molten centre, a delicate rose-water crème brûlée, and artisan cookies. Fresh berries, edible flowers, and gold leaf as styling props. Small cup of Turkish coffee on the side. Shot from a 25-degree overhead angle.
</subject>

<photography>
Premium food photography, wide composition with generous negative space for a banner/cover image.
Soft, diffused natural light — bright and airy with gentle warm tones. Pastel colour grading with pops of vibrant colour from the desserts.
Shallow depth of field, hero dessert sharp and centred, other items artfully arranged with soft focus.
The desserts should look immaculate, glossy, and irresistible — patisserie-level presentation.
High-end bakery mood — think luxury Dubai dessert boutique. Beautiful, indulgent, aspirational.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh lighting, no dark moody tones — keep it bright and inviting.
No steam or vapor. No cluttered composition.
</avoid>`,
  },
  {
    name: "Bao & Bowl",
    slug: "bao-bowl",
    cuisine: "Asian Fusion",
    logo: `Create a premium restaurant logo icon for "Bao & Bowl", a modern Asian street food restaurant specialising in bao buns and rice bowls.

<design>
A stylized mark that fuses two elements: a rounded bao bun shape and a bowl silhouette, merged into a single cohesive symbol. Rendered in warm soy-sauce brown (#4A3728), muted coral/terracotta (#D4795C), and cream on a clean dark background (warm charcoal #2A2520).
Modern, minimal, playful but refined. Think premium casual dining brand — approachable yet design-forward.
Must work as a square icon and read clearly at 128px and 48px.
</design>

<style>
Contemporary Asian street food branding. Palette: warm brown, muted coral, cream, dark charcoal.
Feels like a design-forward Asian eatery in a hip neighbourhood — cool, modern, inviting.
Clean and bold. Subtle texture or grain quality is fine.
Think modern ramen bar or bao shop branding — hip, urban, premium casual.
</style>

<avoid>
No text, no letters, no words, no restaurant name. Icon/symbol only.
No chopsticks, no dragons, no pagodas, no Chinese characters — no stereotypical Asian imagery.
No busy patterns, no photorealism — clean brand mark only.
No cartoons, no kawaii, no clip art.
No gradients that muddy at small sizes.
</avoid>`,

    cover: `Create a photorealistic cover photo for "Bao & Bowl", a modern Asian street food restaurant in Dubai.

<subject>
A vibrant Asian street food spread on a dark wood surface with subtle steam basket textures. Feature fluffy white bao buns (one open showing juicy pork belly filling with pickled cucumber and hoisin glaze) as the hero, alongside a beautiful rice bowl with teriyaki chicken, edamame, pickled ginger, and sesame seeds. Include crispy gyoza dumplings on a ceramic plate, and a steaming bowl of miso soup. Scattered spring onions, chilli flakes, and sesame seeds as styling props. Shot from a 30-degree overhead angle.
</subject>

<photography>
Premium food photography, wide composition with cinematic feel and generous negative space for a banner/cover image.
Dramatic soft side lighting — moody and atmospheric with warm golden highlights against a dark setting.
Rich, saturated but natural colours. Vibrant greens from vegetables, warm amber tones on proteins, clean whites on bao buns.
Shallow depth of field, hero bao sharp and centred, other dishes artfully arranged.
High-end casual mood — think design-forward Asian street food restaurant. Modern, vibrant, elevated.
</photography>

<avoid>
No text, logos, watermarks, menus, or overlays.
No people, hands, or utensils in focus.
No harsh overhead lighting, no flat look, no takeout container vibes.
No steam or vapor. No cluttered composition.
</avoid>`,
  },
];

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log("Generating explore restaurant images (Levant Grill, Sweet Spot Desserts, Bao & Bowl)...\n");

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
