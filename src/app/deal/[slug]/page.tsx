import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DealCta from "@/components/deals/DealCta";
import DealFeedback from "@/components/deals/DealFeedback";
import { DealGrid } from "@/components/deals/DealCard";
import {
  DemoBadge,
  DiscountBadge,
  ExpiryBadge,
  PriceLine,
  TrendingBadge,
  TypeBadge,
  VerifiedBadge,
} from "@/components/deals/DealMeta";
import MerchantLogo from "@/components/merchants/MerchantLogo";
import Badge from "@/components/ui/Badge";
import JsonLd from "@/components/seo/JsonLd";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { getDealBySlug, listDeals, relatedDeals } from "@/lib/repos/deals";
import { breadcrumbList, dealPageSchema } from "@/lib/seo/structured-data";
import { discountLabel, expiryLabel, formatDate, formatDateTime, relativeTime } from "@/lib/utils/format";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { tone: "warning" | "neutral"; message: string }> = {
  EXPIRED: {
    tone: "warning",
    message:
      "This offer has passed its stored end date, so it is no longer listed as active. It is kept here for reference.",
  },
  DISABLED: {
    tone: "neutral",
    message: "This offer has been turned off by an editor and is not currently published.",
  },
  PENDING: {
    tone: "neutral",
    message: "This offer is awaiting review and has not been published yet.",
  },
};

export async function generateMetadata({ params }: PageProps<"/deal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const deal = getDealBySlug(slug, getDb());

  if (!deal) {
    return { title: "Offer not found", robots: { index: false, follow: false } };
  }

  const discount = discountLabel(deal);
  const title = `${deal.merchant.name}: ${deal.title}${discount ? ` (${discount})` : ""}`;
  const description =
    deal.description ??
    `${deal.merchant.name} ${deal.type === "PROMO_CODE" ? "promo code" : "deal"} listed on ${SITE.name}${
      discount ? ` — ${discount}` : ""
    }${deal.expiresAt ? `. Listed end date: ${formatDate(deal.expiresAt)}.` : "."}`;

  return {
    title,
    description,
    alternates: { canonical: `/deal/${deal.slug}` },
    // Only live offers are worth indexing.
    robots: deal.status === "ACTIVE" ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { type: "article", title, description, url: `/deal/${deal.slug}` },
    twitter: { card: "summary", title, description },
  };
}

export default async function DealPage({ params }: PageProps<"/deal/[slug]">) {
  const { slug } = await params;
  const db = getDb();
  sweepExpiredDeals(db);

  const deal = getDealBySlug(slug, db);
  if (!deal) notFound();

  const related = relatedDeals(deal, 4, db);
  const merchantOffers = listDeals(
    { merchantId: deal.merchantId, excludeDealId: deal.id, sort: "best", limit: 4 },
    db,
  );
  const statusNotice = STATUS_COPY[deal.status];
  const feedbackTotal = deal.workedYes + deal.workedNo;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd data={dealPageSchema(deal)} />
      <JsonLd
        data={breadcrumbList([
          { name: "Home", path: "/" },
          { name: deal.merchant.name, path: `/coupons/${deal.merchant.slug}` },
          { name: deal.title, path: `/deal/${deal.slug}` },
        ])}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/coupons/${deal.merchant.slug}`} className="hover:text-brand-700">
          {deal.merchant.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{deal.type === "PROMO_CODE" ? "Promo code" : "Deal"}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_340px]">
        <article>
          <div className="flex items-center gap-3">
            <MerchantLogo name={deal.merchant.name} logo={deal.merchant.logo} />
            <div>
              <Link
                href={`/coupons/${deal.merchant.slug}`}
                className="text-sm font-bold text-slate-900 hover:text-brand-700"
              >
                {deal.merchant.name}
              </Link>
              {deal.category && <p className="text-xs text-slate-500">{deal.category}</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={deal.type} />
            <DiscountBadge deal={deal} />
            <TrendingBadge deal={deal} />
            <DemoBadge isDemo={deal.isDemo} />
            {deal.status !== "ACTIVE" && <Badge tone="warning">{deal.status}</Badge>}
          </div>

          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {deal.title}
          </h1>

          {statusNotice && (
            <p
              className={`mt-4 rounded-xl border p-3 text-sm ${
                statusNotice.tone === "warning"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {statusNotice.message}
            </p>
          )}

          {deal.isDemo && (
            <p className="mt-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3 text-sm text-fuchsia-800">
              <strong className="font-semibold">Sample data.</strong> This record was seeded for
              development and testing. It is not a live offer and the code is not usable.
            </p>
          )}

          {deal.description && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700">
              {deal.description}
            </p>
          )}

          <div className="mt-5">
            <PriceLine deal={deal} />
          </div>

          <dl className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <Detail label="Offer type" value={deal.type === "PROMO_CODE" ? "Promo code" : "Deal — no code needed"} />
            <Detail label="Discount recorded" value={discountLabel(deal) ?? "Not supplied"} />
            <Detail
              label="Expiry"
              value={
                deal.expiresAt
                  ? `${expiryLabel(deal.expiresAt)} (${formatDate(deal.expiresAt)})`
                  : "No end date supplied"
              }
            />
            <Detail
              label="Verification"
              value={
                deal.verified
                  ? `Checked by our team${
                      deal.lastVerifiedAt
                        ? ` ${relativeTime(deal.lastVerifiedAt)} (${formatDate(deal.lastVerifiedAt)})`
                        : ""
                    }`
                  : "Not checked by our team"
              }
            />
            <Detail label="Added" value={formatDateTime(deal.createdAt) ?? "—"} />
            <Detail
              label="Visitor feedback"
              value={
                feedbackTotal > 0
                  ? `${deal.workedYes} said it worked, ${deal.workedNo} said it did not`
                  : "No feedback yet"
              }
            />
            {deal.startDate && (
              <Detail label="Starts" value={formatDate(deal.startDate) ?? "—"} />
            )}
            <Detail label="Clicks recorded" value={deal.clickCount.toLocaleString("en-US")} />
          </dl>

          {deal.terms && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-base font-bold text-slate-900">Terms supplied with this offer</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{deal.terms}</p>
            </section>
          )}

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-bold text-slate-900">Before you buy</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>
                {deal.merchant.name} controls the final price, eligibility and whether this offer is
                still live.
              </li>
              <li>
                Check that your order total actually changes at checkout before completing the
                purchase.
              </li>
              <li>
                {SITE.name} may earn a commission from qualifying purchases made through links on this
                page.
              </li>
            </ul>
          </section>
        </article>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-1.5">
              <VerifiedBadge verified={deal.verified} lastVerifiedAt={deal.lastVerifiedAt} />
              <ExpiryBadge expiresAt={deal.expiresAt} />
            </div>

            <p className="mt-4 text-2xl font-extrabold text-slate-900">
              {discountLabel(deal) ?? (deal.type === "PROMO_CODE" ? "Promo code" : "Current offer")}
            </p>

            <div className="mt-4">
              {deal.status === "ACTIVE" ? (
                <DealCta
                  dealId={deal.id}
                  type={deal.type}
                  couponCode={deal.couponCode}
                  merchantName={deal.merchant.name}
                  src="deal_page"
                  terms={deal.terms}
                  variant="full"
                  isDemo={deal.isDemo}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">This offer is not active</p>
                  <p className="mt-1">
                    We do not send visitors to a store for an offer that is not live.
                  </p>
                  <Link
                    href={`/coupons/${deal.merchant.slug}`}
                    className="mt-3 inline-flex rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    See active {deal.merchant.name} offers
                  </Link>
                </div>
              )}
            </div>

            {deal.status === "ACTIVE" && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <DealFeedback dealId={deal.id} compact />
              </div>
            )}

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Links go through our tracked redirect so we can count clicks. We store the offer, the
              store and an optional campaign tag — no personal details.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Deal Score</h2>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{deal.score}</span>
              <span className="text-sm text-slate-500">/ 100</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Calculated from the stored discount, verification date, how recently the offer was added,
              its expiry, recorded clicks and visitor feedback. Signals with no data are excluded
              rather than guessed.
            </p>
          </div>
        </aside>
      </div>

      {merchantOffers.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-slate-900">
            More {deal.merchant.name} offers
          </h2>
          <div className="mt-4">
            <DealGrid deals={merchantOffers} src="deal_merchant_more" hideMerchant columns={4} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Related deals</h2>
          {deal.category && (
            <p className="mt-1 text-sm text-slate-600">Other offers in {deal.category}.</p>
          )}
          <div className="mt-4">
            <DealGrid deals={related} src="deal_related" columns={4} />
          </div>
        </section>
      )}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}
