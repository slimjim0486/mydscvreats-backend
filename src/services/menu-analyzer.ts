import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { computeMenuHash } from "@/lib/ai-usage";
import { prisma } from "@/lib/prisma";
import type { MenuAnalysisLevel } from "@/lib/entitlements";

let anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

interface RestaurantContext {
  id: string;
  name: string;
  cuisineType: string | null;
  location: string | null;
}

export interface MenuAnalysisResult {
  overallScore: number;
  categories: {
    pricing: CategoryAnalysis;
    descriptions: CategoryAnalysis;
    structure: CategoryAnalysis;
    gaps: CategoryAnalysis;
    seasonal: CategoryAnalysis;
  };
}

export interface CategoryAnalysis {
  score: number;
  title: string;
  summary: string;
  items: AnalysisItem[];
}

export interface AnalysisItem {
  type: "warning" | "suggestion" | "positive";
  message: string;
  menuItemId?: string;
  menuItemName?: string;
}

export async function analyzeMenu(
  restaurant: RestaurantContext,
  level: MenuAnalysisLevel
): Promise<{
  result: MenuAnalysisResult;
  cached: boolean;
  tokensIn: number;
  tokensOut: number;
}> {
  const menuHash = await computeMenuHash(restaurant.id);

  // Check cache: matching hash < 24h old
  const cached = await prisma.menuAnalysis.findFirst({
    where: {
      restaurantId: restaurant.id,
      analysisType: "full",
      menuHash,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (cached) {
    const fullResult = cached.result as unknown as MenuAnalysisResult;
    if (level === "basic") {
      return {
        result: trimToBasic(fullResult),
        cached: true,
        tokensIn: 0,
        tokensOut: 0,
      };
    }
    return { result: fullResult, cached: true, tokensIn: 0, tokensOut: 0 };
  }

  // Run fresh analysis
  const client = getClient();
  if (!client) {
    throw new Error("AI service not configured");
  }

  const sections = await prisma.menuSection.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
        },
      },
    },
  });

  const menuListing = sections
    .map(
      (s) =>
        `## ${s.name}\n${s.items.map((i) => `- ID: ${i.id} | ${i.name} | AED ${i.price} | ${i.description ?? "(no description)"}`).join("\n")}`
    )
    .join("\n\n");

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: `You are a Dubai restaurant menu consultant. Analyze the menu and provide actionable insights.

Current date context: ${month} ${now.getFullYear()}. Consider Dubai's calendar:
- Ramadan (varies): special iftar menus, shorter dining hours
- Summer (Jun-Sep): lighter dishes, cold beverages, indoor dining focus
- Tourist season (Nov-Mar): higher prices justified, international appeal matters
- National Day (Dec 2): celebration menus

Return ONLY valid JSON in this exact format:
{
  "overallScore": 75,
  "categories": {
    "pricing": {
      "score": 80,
      "title": "Pricing Health",
      "summary": "Brief summary",
      "items": [{ "type": "warning|suggestion|positive", "message": "Detail", "menuItemId": "optional", "menuItemName": "optional" }]
    },
    "descriptions": {
      "score": 60,
      "title": "Description Quality",
      "summary": "Brief summary",
      "items": [...]
    },
    "structure": {
      "score": 70,
      "title": "Menu Structure",
      "summary": "Brief summary",
      "items": [...]
    },
    "gaps": {
      "score": 65,
      "title": "Missing Items",
      "summary": "Brief summary",
      "items": [...]
    },
    "seasonal": {
      "score": 80,
      "title": "Seasonal Tips",
      "summary": "Brief summary",
      "items": [...]
    }
  }
}

Analysis criteria:
- Pricing: inconsistencies within sections, outliers for cuisine type in Dubai
- Descriptions: quality score per item, identify weak/missing (under 20 chars) or absent descriptions
- Structure: section count/balance, naming clarity, item distribution
- Gaps: missing staple dishes for cuisine type
- Seasonal: current month opportunities for Dubai market
- Overall score: weighted average (0-100)
- Keep items arrays concise (max 5 items per category)
- Include menuItemId and menuItemName when referencing specific items`,
    messages: [
      {
        role: "user",
        content: `Restaurant: ${restaurant.name}
Cuisine: ${restaurant.cuisineType ?? "International"}
Location: ${restaurant.location ?? "Dubai"}
Total items: ${totalItems}
Total sections: ${sections.length}

Menu:
${menuListing}

Analyze this menu comprehensively.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  const result = JSON.parse(text) as MenuAnalysisResult;

  // Store in cache
  await prisma.menuAnalysis.create({
    data: {
      restaurantId: restaurant.id,
      analysisType: "full",
      result: result as any,
      menuHash,
    },
  });

  const finalResult = level === "basic" ? trimToBasic(result) : result;

  return {
    result: finalResult,
    cached: false,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  };
}

function trimToBasic(result: MenuAnalysisResult): MenuAnalysisResult {
  // For basic tier: only overall score + top 3 issues across all categories
  const allItems = Object.values(result.categories).flatMap((cat) =>
    cat.items
      .filter((i) => i.type !== "positive")
      .map((i) => ({ ...i, categoryTitle: cat.title }))
  );

  const top3 = allItems.slice(0, 3);

  return {
    overallScore: result.overallScore,
    categories: {
      pricing: {
        ...result.categories.pricing,
        items: top3.filter((i) => i.categoryTitle === "Pricing Health"),
      },
      descriptions: {
        ...result.categories.descriptions,
        items: top3.filter((i) => i.categoryTitle === "Description Quality"),
      },
      structure: {
        ...result.categories.structure,
        items: top3.filter((i) => i.categoryTitle === "Menu Structure"),
      },
      gaps: {
        ...result.categories.gaps,
        items: top3.filter((i) => i.categoryTitle === "Missing Items"),
      },
      seasonal: {
        ...result.categories.seasonal,
        items: top3.filter((i) => i.categoryTitle === "Seasonal Tips"),
      },
    },
  };
}
