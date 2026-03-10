export type SubscriptionPlan = "starter" | "pro";
export type AnalyticsTier = "basic" | "advanced";

export interface PlanEntitlements {
  plan: SubscriptionPlan;
  menuItemLimit: number | null;
  widgetEnabled: boolean;
  customDomainEnabled: boolean;
  analyticsTier: AnalyticsTier;
  imageGenerationPriority: number;
  priorityImageGeneration: boolean;
}

const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, Omit<PlanEntitlements, "plan">> = {
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

type RestaurantPlanSource =
  | (Record<string, unknown> & {
      subscription?: {
        plan: SubscriptionPlan;
      } | null;
    })
  | null
  | undefined;

export function getPlanEntitlements(plan: SubscriptionPlan): PlanEntitlements {
  return {
    plan,
    ...PLAN_ENTITLEMENTS[plan],
  };
}

export function getRestaurantPlan(source: RestaurantPlanSource): SubscriptionPlan {
  return source?.subscription?.plan ?? "starter";
}

export function getRestaurantEntitlements(source: RestaurantPlanSource): PlanEntitlements {
  return getPlanEntitlements(getRestaurantPlan(source));
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
