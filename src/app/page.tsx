import Link from "next/link";
import type { Metadata } from "next";
import SearchBar from "@/components/search/SearchBar";
import Section, { EmptyState } from "@/components/ui/Section";
import { DealGrid } from "@/components/deals/DealCard";
import MerchantLogo from "@/components/merchants/MerchantLogo";
import { getHomepageData } from "@/lib/queries/homepage";
import { pluralize } from "@/lib/utils/format";
import { SITE } from "@/lib/site";

// Deal data changes constantly (clicks, expiry sweeps, imports), so the homepage
// is rendered per request rather than cached at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const data = getHomepageData();
  const hasContent = data.totals.activeDeals > 0;

  return (
    <main className="flex flex-col gap-14 pb-4">
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-900 via-brand-950 to-brand-800">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-100 ring-1 ring-inset ring-white/20">
            Coupons, promo codes and deals from every store
          </span>

          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Verified deals.{" "}
            <span className="bg-gradient-to-r from-brand-300 to-emerald-300 bg-clip-text text-transparent">
              Less searching. More saving.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Search coupon codes and deals across {pluralize(data.totals.merchants, "store")}. We show
            what the merchant published, when we last checked it, and nothing we cannot back up.
          </p>

          <div className="mt-8 max-w-2xl">
            <SearchBar size="lg" placeholder="Try a store, brand, product or coupon code…" />
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <Stat value={data.totals.activeDeals.toLocaleString("en-US")} label="Active offers" />
            <Stat value={data.totals.activeCodes.toLocaleString("en-US")} label="Promo codes" />
            <Stat value={data.totals.merchants.toLocaleString("en-US")} label="Stores" />
            <Stat value={data.totals.verified.toLocaleString("en-US")} label="Marked verified" />
          </dl>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            <TrustPoint>Verification dates shown, never implied</TrustPoint>
            <TrustPoint>No invented countdowns or stock claims</TrustPoint>
            <TrustPoint>Affiliate links disclosed</TrustPoint>
          </ul>
        </div>
      </section>

      {!hasContent && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <EmptyState
            title="No active offers yet"
            description="Add merchants and deals in the admin dashboard, or import a CSV file to populate the catalogue."
          >
            <Link
              href="/admin"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Open the admin dashboard
            </Link>
          </EmptyState>
        </div>
      )}

      {data.topDeals.length > 0 && (
        <Section
          id="top-deals"
          title="Today's top deals"
          description="Ranked by our Deal Score: discount strength, verification, freshness and real click activity."
          href="/search?sort=best"
        >
          <DealGrid deals={data.topDeals} src="home_top" />
        </Section>
      )}

      {data.trendingCoupons.length > 0 && (
        <Section
          title="Trending coupons"
          description="Promo codes with the most recorded clicks from DealScout visitors."
          href="/search?type=PROMO_CODE&sort=trending"
        >
          <DealGrid deals={data.trendingCoupons} src="home_trending" />
        </Section>
      )}

      {data.biggestDiscounts.length > 0 && (
        <Section
          title="Biggest discounts"
          description="Offers with the largest discount recorded in our database."
          href="/search?sort=discount&minDiscount=20"
        >
          <DealGrid deals={data.biggestDiscounts} src="home_discount" />
        </Section>
      )}

      {data.endingSoon.length > 0 && (
        <Section
          title="Ending soon"
          description="Offers with a merchant-stated end date in the next seven days."
          href="/search?ending=1&sort=expiring"
        >
          <DealGrid deals={data.endingSoon} src="home_ending" />
        </Section>
      )}

      {data.popularStores.length > 0 && (
        <Section
          title="Popular stores"
          description="Stores with the most click-throughs from this site."
          href="/stores"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.popularStores.map((merchant) => (
              <Link
                key={merchant.id}
                href={`/coupons/${merchant.slug}`}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                <MerchantLogo name={merchant.name} logo={merchant.logo} />
                <span className="text-sm font-semibold text-slate-900">{merchant.name}</span>
                <span className="text-xs text-slate-500">
                  {pluralize(merchant.activeDealCount, "offer")}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {data.recentlyVerified.length > 0 && (
        <Section
          title="Recently verified"
          description="Offers a member of our team checked most recently. The date shown is the date we checked."
          href="/search?verified=1&sort=recently_verified"
        >
          <DealGrid deals={data.recentlyVerified} src="home_verified" />
        </Section>
      )}

      {data.categories.length > 0 && (
        <Section title="Categories" description="Browse offers by what you are shopping for." href="/categories">
          <div className="flex flex-wrap gap-2">
            {data.categories.map((category) => (
              <Link
                key={category.category}
                href={`/search?category=${encodeURIComponent(category.category)}`}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                {category.category}
                <span className="ml-1.5 text-xs font-normal text-slate-500">
                  {category.dealCount}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="How DealScout works" description="Three steps, no guesswork.">
        <div className="grid gap-4 sm:grid-cols-3">
          <HowItWorks
            step="1"
            title="We import offers"
            body="Offers arrive from affiliate networks, merchant feeds, CSV imports and our own editors — then get normalised and de-duplicated."
          />
          <HowItWorks
            step="2"
            title="We rank and check them"
            body="Each offer gets a Deal Score from its discount, freshness, verification date and real click activity. Expired offers drop out automatically."
          />
          <HowItWorks
            step="3"
            title="You get the code"
            body="Copy the code, open the store through a tracked link, then tell us whether it worked so the next visitor sees better information."
          />
        </div>
      </Section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-3xl font-extrabold text-white">{value}</dd>
    </div>
  );
}

function TrustPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="text-emerald-400">
        ✓
      </span>
      {children}
    </li>
  );
}

function HowItWorks({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
        {step}
      </span>
      <h3 className="mt-3 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
