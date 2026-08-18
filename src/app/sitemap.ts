import type { MetadataRoute } from "next";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { countDeals, dealCategories, listDeals } from "@/lib/repos/deals";
import { listMerchants } from "@/lib/repos/merchants";
import { absoluteUrl } from "@/lib/site";

/**
 * Sitemap.
 *
 * Only pages with meaningful, active content are included: merchants need at
 * least one live offer, and deals must be ACTIVE. That keeps thin and expired
 * pages out of the index.
 */

export const dynamic = "force-dynamic";

const MAX_DEAL_URLS = 5000;

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  sweepExpiredDeals(db);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/stores"), changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/categories"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/submit-coupon"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/alerts"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/affiliate-disclosure"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const merchantEntries: MetadataRoute.Sitemap = listMerchants(
    { withActiveDeals: true, limit: 1000, sort: "deals" },
    db,
  ).map((merchant) => ({
    url: absoluteUrl(`/coupons/${merchant.slug}`),
    lastModified: new Date(merchant.updatedAt),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const total = countDeals({ status: "ACTIVE" }, db);
  const dealEntries: MetadataRoute.Sitemap = [];

  // Paged so a large catalogue does not need a single huge query.
  for (let offset = 0; offset < Math.min(total, MAX_DEAL_URLS); offset += 500) {
    const batch = listDeals({ status: "ACTIVE", sort: "newest", limit: 500, offset }, db);
    if (batch.length === 0) break;
    for (const deal of batch) {
      dealEntries.push({
        url: absoluteUrl(`/deal/${deal.slug}`),
        lastModified: new Date(deal.updatedAt),
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  }

  const categoryEntries: MetadataRoute.Sitemap = dealCategories(db).map((category) => ({
    url: `${absoluteUrl("/search")}?category=${encodeURIComponent(category.category)}`,
    changeFrequency: "daily" as const,
    priority: 0.4,
  }));

  return [...staticEntries, ...merchantEntries, ...dealEntries, ...categoryEntries];
}
