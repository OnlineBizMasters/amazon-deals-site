import { NextResponse, type NextRequest } from "next/server";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { countDeals, listDeals } from "@/lib/repos/deals";
import { parseSearchParams, type RawSearchParams } from "@/lib/queries/search";
import { discountLabel } from "@/lib/utils/format";

/**
 * Public JSON search API.
 *
 * Returns the same results as /search. Affiliate URLs are deliberately omitted —
 * consumers should use the tracked `/go/[id]` link so clicks are recorded.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw: RawSearchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { query, page, pageSize, applied } = parseSearchParams(raw);

  const db = getDb();
  sweepExpiredDeals(db);

  const deals = listDeals(query, db);
  const total = countDeals({ ...query, limit: undefined, offset: undefined }, db);

  return NextResponse.json(
    {
      page,
      pageSize,
      total,
      applied,
      deals: deals.map((deal) => ({
        id: deal.id,
        slug: deal.slug,
        title: deal.title,
        description: deal.description,
        type: deal.type,
        hasCouponCode: Boolean(deal.couponCode),
        discountPercent: deal.discountPercent,
        discountAmount: deal.discountAmount,
        discountLabel: discountLabel(deal),
        originalPrice: deal.originalPrice,
        salePrice: deal.salePrice,
        currency: deal.currency,
        expiresAt: deal.expiresAt,
        verified: deal.verified,
        lastVerifiedAt: deal.lastVerifiedAt,
        category: deal.category,
        dealScore: deal.score,
        clickCount: deal.clickCount,
        isSampleData: deal.isDemo,
        merchant: {
          name: deal.merchant.name,
          slug: deal.merchant.slug,
          category: deal.merchant.category,
        },
        links: {
          deal: `/deal/${deal.slug}`,
          merchant: `/coupons/${deal.merchant.slug}`,
          tracked: `/go/${deal.id}`,
        },
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
