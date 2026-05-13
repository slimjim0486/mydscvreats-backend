export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Slugs that conflict with static routes or namespaces the frontend owns.
// A restaurant slug must not equal any of these (or start with `${prefix}/`).
export const RESERVED_SLUGS = new Set([
  "api",
  "audit",
  "best",
  "dashboard",
  "data-deletion",
  "embed",
  "explore",
  "guide",
  "llms.txt",
  "locations",
  "menu-print",
  "p",
  "preview",
  "privacy",
  "r",
  "robots.txt",
  "sign-in",
  "sign-up",
  "sitemap.xml",
  "terms",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
