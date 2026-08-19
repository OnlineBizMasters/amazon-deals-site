import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DealRow from "@/components/deals/DealRow";
import { DealGrid } from "@/components/deals/DealCard";
import MerchantLogo from "@/components/merchants/MerchantLogo";
import Badge from "@/components/ui/Badge";
import JsonLd from "@/components/seo/JsonLd";
import { EmptyState } from "@/components/ui/Section";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { getMerchantBySlug } from "@/lib/repos/merchants";
import { countDeals, listDeals } from "@/lib/repos/deals";
import { breadcrumbList, merchantPageSchema } from "@/lib/seo/structured-data";
import { discountLabel, expiryLabel, formatDate, pluralize, relativeTime } from "@/lib/utils/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/coupons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const merchant = getMerchantBySlug(slug, db);

  if (!merchant) {
    return { title: "Store not found", robots: { index: false, follow: false } };
  }

  const activeCount = countDeals({ merchantId: merchant.id, status: "ACTIVE" }, db);
  const codeCount = countDeals(
    { merchantId: merchant.id, status: "ACTIVE", type: "PROMO_CODE" },
    db,
  );
  const best = listDeals({ merchantId: merchant.id, limit: 1, sort: "discount" }, db)[0];
  const bestDiscount = best ? discountLabel(best) : null;

  const title =
    activeCount > 0
      ? `${merchant.name} Coupons & Promo Codes${bestDiscount ? ` — ${bestDiscount}` : ""}`
      : `${merchant.name} Coupons & Deals`;

  const description =
    activeCount > 0
      ? `${activeCount} ${merchant.name} offer${activeCount === 1 ? "" : "s"} listed on ${SITE.name}${
          codeCount > 0 ? `, including ${codeCount} promo code${codeCount === 1 ? "" : "s"}` : ""
        }. Each offer shows its discount, expiry and when we last checked it.`
      : `${merchant.name} offer history on ${SITE.name}. There are no active offers listed right now.`;

  return {
    title,
    description,
    alternates: { canonical: `/coupons/${merchant.slug}` },
    // Merchant pages with no active offers are thin, so they stay out of the index.
    robots:
      activeCount > 0 && merchant.status === "ACTIVE"
        ? { index: true, follow: true }
        : { index: false, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/coupons/${merchant.slug}`,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function MerchantPage({ params }: PageProps<"/coupons/[slug]">) {
  const { slug } = await params;
  const db = getDb();
  sweepExpiredDeals(db);

  const merchant = getMerchantBySlug(slug, db);
  if (!merchant) notFound();

  const promoCodes = listDeals(
    { merchantId: merchant.id, type: "PROMO_CODE", sort: "best", limit: 40 },
    db,
  );
  const deals = listDeals({ merchantId: merchant.id, type: "DEAL", sort: "best", limit: 40 }, db);
  const bestOffer = listDeals({ merchantId: merchant.id, sort: "best", limit: 1 }, db)[0] ?? null;
  const recentlyVerified = listDeals(
    { merchantId: merchant.id, verifiedOnly: true, sort: "recently_verified", limit: 4 },
    db,
  );
  const expired = listDeals(
    { merchantId: merchant.id, status: "EXPIRED", sort: "newest", limit: 5 },
    db,
  );

  const activeCount = promoCodes.length + deals.length;
  const bestDiscount = bestOffer ? discountLabel(bestOffer) : null;
  const nextExpiry = [...promoCodes, ...deals]
    .map((deal) => deal.expiresAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd data={merchantPageSchema(merchant, [...promoCodes, ...deals].slice(0, 20))} />
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: "Stores", path: "/stores" },
          { name: merchant.name, path: `/coupons/${merchant.slug}` },
        ])}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/stores" className="hover:text-brand-700">
          Stores
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{merchant.name}</span>
      </nav>

      <header className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <MerchantLogo name={merchant.name} logo={merchant.logo} size="lg" />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {merchant.name} Coupons &amp; Promo Codes
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {merchant.category && <Badge tone="brand">{merchant.category}</Badge>}
              <Badge tone="neutral">{pluralize(activeCount, "active offer")}</Badge>
              {promoCodes.length > 0 && (
                <Badge tone="neutral">{pluralize(promoCodes.length, "promo code")}</Badge>
              )}
              {bestDiscount && <Badge tone="savings">Best listed: {bestDiscount}</Badge>}
              {merchant.isDemo && <Badge tone="demo">Sample store</Badge>}
            </div>

            {merchant.description && (
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                {merchant.description}
              </p>
            )}

            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {merchant.websiteUrl && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Website
                  </dt>
                  <dd className="truncate">
                    <a
                      href={merchant.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-brand-700 hover:underline"
                    >
                      {new URL(merchant.websiteUrl).hostname.replace(/^www\./, "")}
                    </a>
                  </dd>
                </div>
              )}
              {nextExpiry && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Next offer to expire
                  </dt>
                  <dd className="text-slate-800">{expiryLabel(nextExpiry) ?? formatDate(nextExpiry)}</dd>
                </div>
              )}
              {recentlyVerified[0]?.lastVerifiedAt && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last verified
                  </dt>
                  <dd className="text-slate-800">
                    {relativeTime(recentlyVerified[0].lastVerifiedAt)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Offers added
                </dt>
                <dd className="text-slate-800">{formatDate(merchant.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <strong className="font-semibold text-slate-700">Affiliate disclosure:</strong>{" "}
          {SITE.name} may earn a commission if you buy after using a link on this page. {merchant.name}{" "}
          sets its own prices, eligibility rules and offer end dates. We show the discount and expiry
          exactly as they were supplied to us, and the date we last checked an offer.{" "}
          <Link href="/affiliate-disclosure" className="font-semibold text-brand-700 hover:underline">
            Full disclosure
          </Link>
          .
        </p>
      </header>

      {bestOffer && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">Best current {merchant.name} offer</h2>
          <p className="mt-1 text-sm text-slate-600">
            Highest Deal Score right now, based on discount, verification date, freshness and recorded
            clicks.
          </p>
          <div className="mt-4">
            <DealRow deal={bestOffer} src="merchant_best" />
          </div>
        </section>
      )}

      {activeCount === 0 && (
        <div className="mt-8">
          <EmptyState
            title={`No active ${merchant.name} offers right now`}
            description="When an offer for this store is imported or added it will appear here. Expired offers are listed below for reference."
          >
            <Link
              href="/alerts"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Set up an alert for this store
            </Link>
          </EmptyState>
        </div>
      )}

      {promoCodes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">
            {merchant.name} promo codes ({promoCodes.length})
          </h2>
          <div className="mt-4 space-y-3">
            {promoCodes.map((deal) => (
              <DealRow key={deal.id} deal={deal} src="merchant_codes" />
            ))}
          </div>
        </section>
      )}

      {deals.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">
            {merchant.name} deals — no code needed ({deals.length})
          </h2>
          <div className="mt-4 space-y-3">
            {deals.map((deal) => (
              <DealRow key={deal.id} deal={deal} src="merchant_deals" />
            ))}
          </div>
        </section>
      )}

      {recentlyVerified.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Recently verified</h2>
          <p className="mt-1 text-sm text-slate-600">
            Offers a member of our team checked most recently. Verification is manual, and the date
            shown is when the check happened — not a guarantee for today.
          </p>
          <div className="mt-4">
            <DealGrid deals={recentlyVerified} src="merchant_verified" hideMerchant columns={4} />
          </div>
        </section>
      )}

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">
            How to use a {merchant.name} code on this page
          </h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <strong className="font-semibold text-slate-800">1.</strong> Select{" "}
              <em>Get Code</em> on the offer you want. The code appears here and {merchant.name} opens
              in a new tab.
            </li>
            <li>
              <strong className="font-semibold text-slate-800">2.</strong> Add your items, then paste
              the code into the promo or discount field at checkout.
            </li>
            <li>
              <strong className="font-semibold text-slate-800">3.</strong> Check the order total
              actually changed before you pay. If it did not, the code may have expired or may not
              apply to your basket.
            </li>
            <li>
              <strong className="font-semibold text-slate-800">4.</strong> Tell us whether it worked
              using the Yes/No buttons — that feedback moves working codes up the page.
            </li>
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">What we can and cannot promise</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              We list the discount, code and end date exactly as supplied by the merchant or affiliate
              network.
            </li>
            <li>
              &ldquo;Verified&rdquo; means a person checked the offer on the date shown. It is not a
              live check, and stores can change or withdraw offers at any time.
            </li>
            <li>
              Offers without a stored end date show no expiry, because we will not invent one.
            </li>
            <li>
              Exclusions, minimum spends and eligibility are set by {merchant.name}, and the store&apos;s
              own terms always take priority.
            </li>
          </ul>
        </div>
      </section>

      {expired.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Recently expired</h2>
          <p className="mt-1 text-sm text-slate-600">
            Kept for reference. These are no longer active and are excluded from the listings above.
          </p>
          <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {expired.map((deal) => (
              <li key={deal.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
                <span className="flex-1 text-slate-600">
                  <Link href={`/deal/${deal.slug}`} className="hover:text-brand-700">
                    {deal.title}
                  </Link>
                </span>
                {deal.expiresAt && (
                  <span className="text-xs text-slate-500">
                    Ended {formatDate(deal.expiresAt)}
                  </span>
                )}
                <Badge tone="warning">Expired</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
