/** Brand and deployment configuration shared by SEO metadata, links and content templates. */

export const SITE = {
  name: "DealScout",
  tagline: "Verified deals. Less searching. More saving.",
  description:
    "DealScout collects coupon codes and deals from stores across the web, checks what we can, ranks the best offers and links you straight through. No fake countdowns, no invented discounts.",
  /** Public-facing contact used on the compliance pages. */
  contactEmail: process.env.CONTACT_EMAIL?.trim() || "hello@example.com",
} as const;

/**
 * Absolute site origin, used for canonical URLs, sitemap entries and the links
 * embedded in generated social content. Falls back to localhost for development.
 *
 * `SITE_URL` is read at runtime and is the one to set when the origin is only
 * known at deploy time; `NEXT_PUBLIC_SITE_URL` is inlined during the build, so it
 * has no effect if it is set only when starting the server.
 */
function configuredOrigin(): string {
  return (
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "")
  );
}

export function siteUrl(): string {
  return (configuredOrigin() || "http://localhost:3000").replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  const base = siteUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

/**
 * True when the deployment origin has been configured explicitly. Crawling is
 * only invited once this is set, so previews and local runs stay out of indexes.
 */
export function siteUrlConfigured(): boolean {
  return configuredOrigin().length > 0;
}
