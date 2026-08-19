import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/Section";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { dealCategories } from "@/lib/repos/deals";
import { pluralize } from "@/lib/utils/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deal categories",
  description: `Browse coupon codes and deals by category on ${SITE.name}.`,
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  const db = getDb();
  sweepExpiredDeals(db);
  const categories = dealCategories(db);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Categories</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Browse by category
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Categories are listed once they contain at least one active offer.
      </p>

      {categories.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No categories yet"
            description="Categories appear automatically once deals are added with a category set."
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.category}>
              <Link
                href={`/search?category=${encodeURIComponent(category.category)}`}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                <span className="text-lg font-bold text-slate-900">{category.category}</span>
                <span className="mt-1 text-sm text-slate-600">
                  {pluralize(category.dealCount, "active offer")}
                </span>
                {category.codeCount > 0 && (
                  <span className="mt-auto pt-3 text-xs font-semibold text-brand-700">
                    {pluralize(category.codeCount, "promo code")} →
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
