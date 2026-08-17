"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard, { type CardProduct } from "@/components/ProductCard";
import type { SortKey } from "@/lib/products";

interface DealsExplorerProps {
  initialProducts: CardProduct[];
  categories: string[];
}

interface ApiResponse {
  count: number;
  products: CardProduct[];
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "discount", label: "Biggest discount" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

export default function DealsExplorer({
  initialProducts,
  categories,
}: DealsExplorerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("discount");
  const [onlyBigDeals, setOnlyBigDeals] = useState(false);
  const [products, setProducts] = useState<CardProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  const allCategories = useMemo(() => ["All", ...categories], [categories]);

  useEffect(() => {
    // Keep the server-rendered results on first paint; only hit the API once
    // the visitor actually changes a filter.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "All") params.set("category", category);
      params.set("sort", sort);
      if (onlyBigDeals) params.set("minDiscount", "40");

      try {
        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: ApiResponse = await res.json();
        setProducts(data.products);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, category, sort, onlyBigDeals]);

  return (
    <section id="deals" className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals — try “headphones”, “coffee”, “yoga”…"
              aria-label="Search deals"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort deals"
            className="rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="flex select-none items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={onlyBigDeals}
              onChange={(e) => setOnlyBigDeals(e.target.checked)}
              className="h-4 w-4 accent-orange-600"
            />
            40%+ off
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => {
            const active = cat === category;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-orange-600 bg-orange-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-700"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500" aria-live="polite">
          {loading
            ? "Finding deals…"
            : `${products.length} ${products.length === 1 ? "deal" : "deals"} found`}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-4xl">🛒</p>
          <p className="mt-3 font-semibold text-slate-700">No deals match your filters</p>
          <p className="text-sm text-slate-500">Try a different search or category.</p>
        </div>
      ) : (
        <div
          className={`mt-4 grid grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-4 ${
            loading ? "opacity-60" : "opacity-100"
          }`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
