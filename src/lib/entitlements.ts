export type SubscriptionPlan = "starter" | "pro";
export type AnalyticsTier = "basic" | "advanced";

export interface PlanEntitlements {
  plan: SubscriptionPlan | null;
  hasSelectedPlan: boolean;
  menuItemLimit: number | null;
  widgetEnabled: boolean;
  customDomainEnabled: boolean;
  analyticsTier: AnalyticsTier;
  imageGenerationPriority: number;
  priorityImageGeneration: boolean;
}

const PLAN_ENTITLEMENTS: Record<
  SubscriptionPlan,
  Omit<PlanEntitlements, "plan" | "hasSelectedPlan">
> = {
  starter: {
    menuItemLimit: 30,
    widgetEnabled: false,
    customDomainEnabled: false,
    analyticsTier: "basic",
    imageGenerationPriority: 0,
    priorityImageGeneration: false,
  },
  pro: {
    menuItemLimit: null,
    widgetEnabled: true,
    customDomainEnabled: false,
    analyticsTier: "advanced",
    imageGenerationPriority: 10,
    priorityImageGeneration: true,
  },
};

const DRAFT_ENTITLEMENTS: PlanEntitlements = {
  plan: null,
  hasSelectedPlan: false,
  menuItemLimit: null,
  widgetEnabled: false,
  customDomainEnabled: false,
  analyticsTier: "basic",
  imageGenerationPriority: 0,
  priorityImageGeneration: false,
};

type RestaurantPlanSource =
  | (Record<string, unknown> & {
      subscription?: {
        plan: SubscriptionPlan;
        stripeSubscriptionId?: string | null;
      } | null;
    })
  | null
  | undefined;

export function getPlanEntitlements(plan: SubscriptionPlan): PlanEntitlements {
  return {
    plan,
    hasSelectedPlan: true,
    ...PLAN_ENTITLEMENTS[plan],
  };
}

export function hasSelectedPlan(source: RestaurantPlanSource) {
  return Boolean(source?.subscription?.stripeSubscriptionId);
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

export function getMenuItemLimitMessage(limit: number) {
  return `Starter includes up to ${limit} menu items. Upgrade to Pro for unlimited dishes.`;
}
