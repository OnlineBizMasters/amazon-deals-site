"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Site search. Submits to /search so results are server-rendered and shareable.
 */
export default function SearchBar({
  initialQuery = "",
  size = "md",
  placeholder = "Search a store, brand, product or code…",
}: {
  initialQuery?: string;
  size?: "md" | "lg";
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  const inputClasses =
    size === "lg"
      ? "w-full rounded-xl border-0 bg-white py-4 pl-12 pr-32 text-base text-slate-900 shadow-lg ring-1 ring-white/20 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400"
      : "w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-24 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${
          size === "lg" ? "left-4 text-lg" : "left-3 text-sm"
        }`}
      >
        ⌕
      </span>
      <input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label="Search deals, stores and coupon codes"
        className={inputClasses}
      />
      <button
        type="submit"
        className={`absolute top-1/2 -translate-y-1/2 rounded-lg bg-brand-600 font-bold text-white transition hover:bg-brand-700 ${
          size === "lg" ? "right-2 px-5 py-2.5 text-sm" : "right-1.5 px-3.5 py-1.5 text-xs"
        }`}
      >
        Search
      </button>
    </form>
  );
}
