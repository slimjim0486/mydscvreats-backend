export type SubscriptionPlan = "starter" | "pro";
export type AnalyticsTier = "basic" | "advanced";
export type MenuAnalysisLevel = "basic" | "full";
export type SubscriptionStatus = "trial" | "active" | "paused" | "cancelled";

export interface PlanEntitlements {
  plan: SubscriptionPlan | null;
  hasSelectedPlan: boolean;
  menuItemLimit: number | null;
  widgetEnabled: boolean;
  customDomainEnabled: boolean;
  shortLinksEnabled: boolean;
  analyticsTier: AnalyticsTier;
  imageGenerationPriority: number;
  priorityImageGeneration: boolean;
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
    widgetEnabled: false,
    customDomainEnabled: false,
    shortLinksEnabled: false,
    analyticsTier: "basic",
    imageGenerationPriority: 0,
    priorityImageGeneration: false,
    aiDescriptionLimit: 5,
    bulkDescriptionEnabled: false,
    aiTagAnalysisLimit: 1,
    menuAnalysisLevel: "basic",
    analysisLimit: 1,
  },
  pro: {
    menuItemLimit: null,
    widgetEnabled: true,
    customDomainEnabled: false,
    shortLinksEnabled: true,
    analyticsTier: "advanced",
    imageGenerationPriority: 10,
    priorityImageGeneration: true,
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
  widgetEnabled: false,
  customDomainEnabled: false,
  shortLinksEnabled: false,
  analyticsTier: "basic",
  imageGenerationPriority: 0,
  priorityImageGeneration: false,
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
