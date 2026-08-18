import { isDealType, type DealType } from "../domain/types";
import type { DealQuery, DealSort } from "../repos/deals";

/**
 * Translates public query-string parameters into a validated `DealQuery`.
 * Shared by the /search page and the JSON API so both behave identically.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

const SORTS: DealSort[] = [
  "best",
  "newest",
  "discount",
  "expiring",
  "popular",
  "trending",
  "recently_verified",
];

export const PAGE_SIZE = 24;

export interface ParsedSearch {
  query: DealQuery;
  page: number;
  pageSize: number;
  /** Echo of the accepted values, used to render the UI state. */
  applied: {
    q: string;
    category: string | null;
    merchant: string | null;
    type: DealType | null;
    verifiedOnly: boolean;
    endingSoon: boolean;
    minDiscount: number | null;
    sort: DealSort;
  };
}

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseSearchParams(params: RawSearchParams): ParsedSearch {
  const q = (first(params.q) ?? "").trim().slice(0, 120);
  const category = first(params.category)?.trim() || null;
  const merchant = first(params.merchant)?.trim() || null;

  const typeRaw = first(params.type)?.trim().toUpperCase();
  const type = isDealType(typeRaw) ? typeRaw : null;

  const verifiedOnly = first(params.verified) === "1";
  const endingSoon = first(params.ending) === "1";

  const minDiscountRaw = Number.parseInt(first(params.minDiscount) ?? "", 10);
  const minDiscount =
    Number.isFinite(minDiscountRaw) && minDiscountRaw > 0 && minDiscountRaw <= 100
      ? minDiscountRaw
      : null;

  const sortRaw = first(params.sort) as DealSort | null;
  const sort: DealSort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : "best";

  const pageRaw = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 200) : 1;

  const query: DealQuery = {
    q: q || undefined,
    category: category ?? undefined,
    merchantSlug: merchant ?? undefined,
    type: type ?? undefined,
    verifiedOnly: verifiedOnly || undefined,
    endingWithinDays: endingSoon ? 7 : undefined,
    minDiscount: minDiscount ?? undefined,
    sort,
    status: "ACTIVE",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  return {
    query,
    page,
    pageSize: PAGE_SIZE,
    applied: { q, category, merchant, type, verifiedOnly, endingSoon, minDiscount, sort },
  };
}

/** Builds a query string for pagination links, preserving the active filters. */
export function buildSearchHref(params: RawSearchParams, overrides: Record<string, string | null>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const single = first(value);
    if (single) search.set(key, single);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) search.delete(key);
    else search.set(key, value);
  }

  const query = search.toString();
  return query ? `/search?${query}` : "/search";
}
