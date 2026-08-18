import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import FilterPanel from "@/components/search/FilterPanel";
import SearchBar from "@/components/search/SearchBar";
import { DealGrid } from "@/components/deals/DealCard";
import { EmptyState } from "@/components/ui/Section";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { countDeals, dealCategories, listDeals } from "@/lib/repos/deals";
import { listMerchants } from "@/lib/repos/merchants";
import { buildSearchHref, parseSearchParams, type RawSearchParams } from "@/lib/queries/search";
import { pluralize } from "@/lib/utils/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> {
  const params = (await searchParams) as RawSearchParams;
  const { applied } = parseSearchParams(params);

  const parts: string[] = [];
  if (applied.q) parts.push(`"${applied.q}"`);
  if (applied.merchant) parts.push(applied.merchant);
  if (applied.category) parts.push(applied.category);
  if (applied.type === "PROMO_CODE") parts.push("promo codes");

  const title = parts.length > 0 ? `Search: ${parts.join(" · ")}` : "Search coupons and deals";

  return {
    title,
    description: applied.q
      ? `Coupon codes and deals matching "${applied.q}" on ${SITE.name}.`
      : "Search verified coupon codes and deals across every store we track.",
    // Filtered result pages are thin and near-duplicate, so they are not indexed.
    robots: { index: false, follow: true },
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = (await searchParams) as RawSearchParams;
  const { query, page, pageSize, applied } = parseSearchParams(params);

  const db = getDb();
  sweepExpiredDeals(db);

  const deals = listDeals(query, db);
  const total = countDeals({ ...query, limit: undefined, offset: undefined }, db);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const categories = dealCategories(db).map((entry) => entry.category);
  const merchants = listMerchants({ withActiveDeals: true, sort: "name", limit: 500 }, db).map(
    (merchant) => ({ slug: merchant.slug, name: merchant.name }),
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Search</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {applied.q ? `Results for “${applied.q}”` : "Browse coupons and deals"}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {pluralize(total, "active offer")} found
        {applied.verifiedOnly ? " · verified only" : ""}
        {applied.endingSoon ? " · ending within 7 days" : ""}
      </p>

      <div className="mt-5 lg:hidden">
        <SearchBar initialQuery={applied.q} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Suspense
          fallback={
            <div className="h-64 rounded-2xl border border-slate-200 bg-white p-4" aria-hidden="true" />
          }
        >
          <FilterPanel options={{ categories, merchants }} />
        </Suspense>

        <div>
          {deals.length === 0 ? (
            <EmptyState
              title="No offers match these filters"
              description="Try removing a filter, lowering the minimum discount, or searching for a store name instead."
            >
              <Link
                href="/search"
                className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Clear filters
              </Link>
            </EmptyState>
          ) : (
            <>
              <DealGrid deals={deals} src="search" columns={3} />

              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-5"
                >
                  {page > 1 ? (
                    <Link
                      href={buildSearchHref(params, { page: String(page - 1) })}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-400"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span />
                  )}

                  <p className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </p>

                  {page < totalPages ? (
                    <Link
                      href={buildSearchHref(params, { page: String(page + 1) })}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-400"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
