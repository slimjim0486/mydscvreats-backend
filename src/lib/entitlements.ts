export type SubscriptionPlan = "starter" | "pro";
export type AnalyticsTier = "basic" | "advanced";
export type MenuAnalysisLevel = "basic" | "full";
export type SubscriptionStatus = "trial" | "active" | "paused" | "cancelled";

export interface PlanEntitlements {
  plan: SubscriptionPlan | null;
  hasSelectedPlan: boolean;
  menuItemLimit: number | null;
  sourcePhotoImportEnabled: boolean;
  sourcePhotoReviewEnabled: boolean;
  widgetEnabled: boolean;
  menuAssistantEnabled: boolean;
  customDomainEnabled: boolean;
  shortLinksEnabled: boolean;
  hideBranding: boolean;
  analyticsTier: AnalyticsTier;
  imageGenerationPriority: number;
  priorityImageGeneration: boolean;
  imageEnhancementLimit: number | null;
  batchImageEnhancementEnabled: boolean;
  advancedPhotoStylingEnabled: boolean;
  aiDescriptionLimit: number | null;
  bulkDescriptionEnabled: boolean;
  aiTagAnalysisLimit: number | null;
  menuAnalysisLevel: MenuAnalysisLevel;
  analysisLimit: number | null;
}

const PLAN_ENTITLEMENTS: Record<
  SubscriptionPlan,
  Omit<PlanEntitlements, "plan" | "hasSelectedPlan">
> = {
  starter: {
    menuItemLimit: 30,
    sourcePhotoImportEnabled: true,
    sourcePhotoReviewEnabled: true,
    widgetEnabled: false,
    menuAssistantEnabled: false,
    customDomainEnabled: false,
    shortLinksEnabled: false,
    hideBranding: false,
    analyticsTier: "basic",
    imageGenerationPriority: 0,
    priorityImageGeneration: false,
    imageEnhancementLimit: 5,
    batchImageEnhancementEnabled: false,
    advancedPhotoStylingEnabled: false,
    aiDescriptionLimit: 5,
    bulkDescriptionEnabled: false,
    aiTagAnalysisLimit: 1,
    menuAnalysisLevel: "basic",
    analysisLimit: 1,
  },
  pro: {
    menuItemLimit: null,
    sourcePhotoImportEnabled: true,
    sourcePhotoReviewEnabled: true,
    widgetEnabled: true,
    menuAssistantEnabled: true,
    customDomainEnabled: false,
    shortLinksEnabled: true,
    hideBranding: true,
    analyticsTier: "advanced",
    imageGenerationPriority: 10,
    priorityImageGeneration: true,
    imageEnhancementLimit: null,
    batchImageEnhancementEnabled: true,
    advancedPhotoStylingEnabled: true,
    aiDescriptionLimit: null,
    bulkDescriptionEnabled: true,
    aiTagAnalysisLimit: null,
    menuAnalysisLevel: "full",
    analysisLimit: null,
  },
};

const DRAFT_ENTITLEMENTS: PlanEntitlements = {
  plan: null,
  hasSelectedPlan: false,
  menuItemLimit: null,
  sourcePhotoImportEnabled: true,
  sourcePhotoReviewEnabled: true,
  widgetEnabled: false,
  menuAssistantEnabled: false,
  customDomainEnabled: false,
  shortLinksEnabled: false,
  hideBranding: false,
  analyticsTier: "basic",
  imageGenerationPriority: 0,
  priorityImageGeneration: false,
  imageEnhancementLimit: 3,
  batchImageEnhancementEnabled: false,
  advancedPhotoStylingEnabled: false,
  aiDescriptionLimit: 3,
  bulkDescriptionEnabled: false,
  aiTagAnalysisLimit: 1,
  menuAnalysisLevel: "basic",
  analysisLimit: 1,
};

type RestaurantPlanSource =
  | (Record<string, unknown> & {
      subscriptionStatus?: SubscriptionStatus;
      subscription?: {
        plan?: SubscriptionPlan;
        status?: SubscriptionStatus;
        stripeSubscriptionId?: string | null;
      } | null;
    })
  | null
  | undefined;

function getSubscriptionStatus(source: RestaurantPlanSource): SubscriptionStatus | null {
  return source?.subscription?.status ?? source?.subscriptionStatus ?? null;
}

export function getPlanEntitlements(plan: SubscriptionPlan): PlanEntitlements {
  return {
    plan,
    hasSelectedPlan: true,
    ...PLAN_ENTITLEMENTS[plan],
  };
}

export function hasSelectedPlan(source: RestaurantPlanSource) {
  return Boolean(source?.subscription?.plan && getSubscriptionStatus(source) !== "cancelled");
}

export function getRestaurantPlan(source: RestaurantPlanSource): SubscriptionPlan | null {
  if (!hasSelectedPlan(source)) {
    return null;
  }

  return source?.subscription?.plan ?? null;
}

export function getRestaurantEntitlements(source: RestaurantPlanSource): PlanEntitlements {
  const plan = getRestaurantPlan(source);
  return plan ? getPlanEntitlements(plan) : DRAFT_ENTITLEMENTS;
}

export function withRestaurantEntitlements<T extends RestaurantPlanSource>(
  restaurant: T
): T & { entitlements: PlanEntitlements } {
  return {
    ...restaurant,
    entitlements: getRestaurantEntitlements(restaurant),
  };
}

export function getEffectiveRestaurantBillingState(source: RestaurantPlanSource) {
  const status = getSubscriptionStatus(source) ?? "trial";
  const hasPlan = hasSelectedPlan(source);

  return {
    subscriptionStatus: status,
    isPublished: hasPlan && (status === "trial" || status === "active"),
  };
}

export function getMenuItemLimitMessage(limit: number) {
  return `Starter includes up to ${limit} menu items. Upgrade to Pro for unlimited dishes.`;
}

export function getMenuAssistantUpgradeMessage() {
  return "AI menu assistant is available on Pro. Upgrade to save private AI notes and offer diner chat.";
}
