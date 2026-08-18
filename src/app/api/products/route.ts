import { NextResponse, type NextRequest } from "next/server";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { listDeals, type DealSort } from "@/lib/repos/deals";

/**
 * Legacy endpoint from the Amazon-only version of this project.
 *
 * It is kept so existing integrations keep working, but it is now backed by the
 * deal engine and only returns offers that have prices stored. New consumers
 * should use `/api/deals`, which exposes merchants, coupon codes and tracked links.
 */

export const dynamic = "force-dynamic";

const SORT_MAP: Record<string, DealSort> = {
  discount: "discount",
  "price-asc": "best",
  "price-desc": "best",
  rating: "best",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q") ?? undefined;
  const categoryParam = searchParams.get("category");
  const category = categoryParam && categoryParam !== "All" ? categoryParam : undefined;
  const sortParam = searchParams.get("sort") ?? "discount";
  const minDiscountRaw = Number(searchParams.get("minDiscount") ?? "0");
  const minDiscount = Number.isFinite(minDiscountRaw) && minDiscountRaw > 0 ? minDiscountRaw : undefined;

  const db = getDb();
  sweepExpiredDeals(db);

  const deals = listDeals(
    {
      q,
      category,
      minDiscount,
      sort: SORT_MAP[sortParam] ?? "discount",
      limit: 100,
    },
    db,
  ).filter((deal) => typeof deal.salePrice === "number");

  const products = deals.map((deal) => ({
    id: deal.slug,
    title: deal.title,
    category: deal.category ?? deal.merchant.category,
    merchant: deal.merchant.name,
    price: deal.salePrice,
    listPrice: deal.originalPrice,
    discountPercent: deal.discountPercent === null ? 0 : Math.round(deal.discountPercent),
    blurb: deal.description,
    url: `/deal/${deal.slug}`,
    trackedUrl: `/go/${deal.id}`,
    isSampleData: deal.isDemo,
  }));

  if (sortParam === "price-asc") products.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (sortParam === "price-desc") products.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

  return NextResponse.json(
    {
      deprecated: true,
      replacement: "/api/deals",
      note: "This endpoint only lists offers that have prices stored. Use /api/deals for the full catalogue including coupon codes.",
      count: products.length,
      query: {
        q: q ?? "",
        category: categoryParam ?? "All",
        sort: sortParam,
        minDiscount: minDiscount ?? 0,
      },
      products,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
