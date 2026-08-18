"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * URL-driven filter panel. Every control writes to the query string, so results
 * are server-rendered, bookmarkable and shareable.
 */

export interface FilterOptions {
  categories: string[];
  merchants: { slug: string; name: string }[];
}

const SORT_OPTIONS = [
  { value: "best", label: "Best match (Deal Score)" },
  { value: "newest", label: "Newest first" },
  { value: "discount", label: "Biggest discount" },
  { value: "expiring", label: "Ending soon" },
  { value: "popular", label: "Most clicked" },
  { value: "trending", label: "Trending" },
  { value: "recently_verified", label: "Recently verified" },
];

const MIN_DISCOUNTS = [
  { value: "", label: "Any discount" },
  { value: "10", label: "10%+ off" },
  { value: "20", label: "20%+ off" },
  { value: "30", label: "30%+ off" },
  { value: "40", label: "40%+ off" },
  { value: "50", label: "50%+ off" },
  { value: "70", label: "70%+ off" },
];

export default function FilterPanel({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      params.delete("page");
      const query = params.toString();
      router.push(query ? `/search?${query}` : "/search");
    },
    [router, searchParams],
  );

  const current = (key: string, fallback = "") => searchParams.get(key) ?? fallback;
  const isOn = (key: string) => searchParams.get(key) === "1";

  const hasFilters = ["category", "merchant", "type", "verified", "minDiscount", "ending", "sort"].some(
    (key) => searchParams.get(key),
  );

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Filters</h2>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              const query = searchParams.get("q");
              router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
            }}
            className="text-xs font-semibold text-brand-700 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="filter-sort" className="mb-1 block text-xs font-semibold text-slate-700">
            Sort by
          </label>
          <select
            id="filter-sort"
            value={current("sort", "best")}
            onChange={(event) => update("sort", event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-category" className="mb-1 block text-xs font-semibold text-slate-700">
            Category
          </label>
          <select
            id="filter-category"
            value={current("category")}
            onChange={(event) => update("category", event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            <option value="">All categories</option>
            {options.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-merchant" className="mb-1 block text-xs font-semibold text-slate-700">
            Store
          </label>
          <select
            id="filter-merchant"
            value={current("merchant")}
            onChange={(event) => update("merchant", event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            <option value="">All stores</option>
            {options.merchants.map((merchant) => (
              <option key={merchant.slug} value={merchant.slug}>
                {merchant.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-discount" className="mb-1 block text-xs font-semibold text-slate-700">
            Minimum discount
          </label>
          <select
            id="filter-discount"
            value={current("minDiscount")}
            onChange={(event) => update("minDiscount", event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            {MIN_DISCOUNTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Only offers with a stored discount are included.
          </p>
        </div>

        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-slate-700">Offer type</legend>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "", label: "All" },
              { value: "PROMO_CODE", label: "Promo codes only" },
              { value: "DEAL", label: "Deals only" },
            ].map((option) => {
              const active = current("type") === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => update("type", option.value)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-brand-400"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2 border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isOn("verified")}
              onChange={(event) => update("verified", event.target.checked ? "1" : null)}
              className="h-4 w-4 accent-brand-600"
            />
            Verified only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isOn("ending")}
              onChange={(event) => update("ending", event.target.checked ? "1" : null)}
              className="h-4 w-4 accent-brand-600"
            />
            Ending within 7 days
          </label>
        </div>
      </div>
    </aside>
  );
}
