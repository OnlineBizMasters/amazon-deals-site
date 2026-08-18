import { getDb, sweepExpiredDeals } from "../db/client";
import { dealCategories, listDeals, countDeals } from "../repos/deals";
import { listMerchants, type MerchantWithCounts } from "../repos/merchants";
import { qualifiesAsTrending } from "../services/deal-score";
import type { ScoredDeal } from "../db/mappers";

/**
 * Homepage composition.
 *
 * Sections are built from stored signals only: "trending" requires real click
 * volume or an administrator flag, and "ending soon" requires a stored expiry.
 * Any section without qualifying data is returned empty and hidden by the page,
 * rather than being padded out.
 */

export interface HomepageData {
  topDeals: ScoredDeal[];
  trendingCoupons: ScoredDeal[];
  biggestDiscounts: ScoredDeal[];
  endingSoon: ScoredDeal[];
  recentlyVerified: ScoredDeal[];
  popularStores: MerchantWithCounts[];
  categories: { category: string; dealCount: number; codeCount: number }[];
  totals: {
    activeDeals: number;
    activeCodes: number;
    merchants: number;
    verified: number;
  };
}

export function getHomepageData(): HomepageData {
  const db = getDb();
  sweepExpiredDeals(db);

  const topDeals = listDeals({ limit: 8, sort: "best" }, db);

  const trendingCoupons = listDeals({ type: "PROMO_CODE", limit: 16, sort: "trending" }, db)
    .filter((deal) => qualifiesAsTrending(deal, { minClicks: 20 }))
    .slice(0, 8);

  const biggestDiscounts = listDeals({ limit: 8, sort: "discount", minDiscount: 20 }, db);

  const endingSoon = listDeals({ limit: 8, sort: "expiring", endingWithinDays: 7 }, db);

  const recentlyVerified = listDeals(
    { limit: 8, sort: "recently_verified", verifiedOnly: true },
    db,
  );

  const popularStores = listMerchants(
    { sort: "clicks", withActiveDeals: true, limit: 12 },
    db,
  );

  return {
    topDeals,
    trendingCoupons,
    biggestDiscounts,
    endingSoon,
    recentlyVerified,
    popularStores,
    categories: dealCategories(db).slice(0, 12),
    totals: {
      activeDeals: countDeals({ status: "ACTIVE" }, db),
      activeCodes: countDeals({ status: "ACTIVE", type: "PROMO_CODE" }, db),
      merchants: listMerchants({ withActiveDeals: true, limit: 1000 }, db).length,
      verified: countDeals({ status: "ACTIVE", verifiedOnly: true }, db),
    },
  };
}
