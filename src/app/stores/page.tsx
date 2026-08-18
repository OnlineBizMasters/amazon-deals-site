import Link from "next/link";
import type { Metadata } from "next";
import MerchantLogo from "@/components/merchants/MerchantLogo";
import Badge from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Section";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { listMerchants } from "@/lib/repos/merchants";
import { pluralize } from "@/lib/utils/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All stores with coupons and deals",
  description: `Browse every store currently listed on ${SITE.name}, with the number of active promo codes and deals for each.`,
  alternates: { canonical: "/stores" },
};

export default function StoresPage() {
  const db = getDb();
  sweepExpiredDeals(db);

  // Only stores with live offers are listed, so this page never becomes a wall of
  // empty merchant links.
  const merchants = listMerchants({ withActiveDeals: true, sort: "name", limit: 1000 }, db);

  const grouped = merchants.reduce<Record<string, typeof merchants>>((accumulator, merchant) => {
    const letter = /^[a-z]/i.test(merchant.name) ? merchant.name[0].toUpperCase() : "#";
    accumulator[letter] = accumulator[letter] ?? [];
    accumulator[letter].push(merchant);
    return accumulator;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Stores</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        Stores with active offers
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {pluralize(merchants.length, "store")} listed. Stores appear here once they have at least one
        live offer.
      </p>

      {merchants.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No stores with active offers yet"
            description="Add a merchant and at least one active deal in the admin dashboard, or import a CSV file."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:border-brand-400 hover:text-brand-700"
              >
                {letter}
              </a>
            ))}
          </div>

          <div className="mt-8 space-y-10">
            {letters.map((letter) => (
              <section key={letter} id={`letter-${letter}`}>
                <h2 className="border-b border-slate-200 pb-2 text-lg font-bold text-slate-900">
                  {letter}
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[letter].map((merchant) => (
                    <li key={merchant.id}>
                      <Link
                        href={`/coupons/${merchant.slug}`}
                        className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
                      >
                        <MerchantLogo name={merchant.name} logo={merchant.logo} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900">
                            {merchant.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {pluralize(merchant.activeDealCount, "offer")}
                            {merchant.activeCodeCount > 0
                              ? ` · ${merchant.activeCodeCount} code${
                                  merchant.activeCodeCount === 1 ? "" : "s"
                                }`
                              : ""}
                          </span>
                        </span>
                        {merchant.bestDiscountPercent !== null && merchant.bestDiscountPercent > 0 && (
                          <Badge tone="savings">
                            {Math.round(merchant.bestDiscountPercent)}%
                          </Badge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
