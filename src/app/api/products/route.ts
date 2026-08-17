import { NextRequest, NextResponse } from "next/server";
import {
  discountPercent,
  queryProducts,
  type SortKey,
} from "@/lib/products";

const VALID_SORTS: SortKey[] = ["discount", "price-asc", "price-desc", "rating"];

function parseSort(value: string | null): SortKey {
  return VALID_SORTS.includes(value as SortKey) ? (value as SortKey) : "discount";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const sort = parseSort(searchParams.get("sort"));
  const minDiscountRaw = Number(searchParams.get("minDiscount") ?? "0");
  const minDiscount = Number.isFinite(minDiscountRaw) ? minDiscountRaw : 0;

  const results = queryProducts({ q, category, sort, minDiscount });

  return NextResponse.json({
    count: results.length,
    query: { q: q ?? "", category: category ?? "All", sort, minDiscount },
    products: results.map((p) => ({
      ...p,
      discountPercent: discountPercent(p),
    })),
  });
}
