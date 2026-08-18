import Link from "next/link";
import DealCta from "./DealCta";
import {
  DemoBadge,
  ExpiryBadge,
  PriceLine,
  TrendingBadge,
  TypeBadge,
  VerifiedBadge,
} from "./DealMeta";
import { discountLabel } from "@/lib/utils/format";
import type { ScoredDeal } from "@/lib/db/mappers";

/**
 * Wide list row used on merchant pages, where the discount needs to be the first
 * thing scanned down the left edge.
 */
export default function DealRow({ deal, src }: { deal: ScoredDeal; src?: string | null }) {
  const discount = discountLabel(deal);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="flex w-full shrink-0 items-center gap-3 sm:w-32 sm:flex-col sm:items-start sm:gap-1">
        {discount ? (
          <p className="text-2xl font-extrabold leading-none text-emerald-600 sm:text-3xl">
            {discount.replace(" off", "")}
            <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-700/80">
              off
            </span>
          </p>
        ) : (
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            {deal.type === "PROMO_CODE" ? "Code" : "Offer"}
          </p>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={deal.type} />
          <TrendingBadge deal={deal} />
          <DemoBadge isDemo={deal.isDemo} />
        </div>

        <h3 className="mt-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">
          <Link href={`/deal/${deal.slug}`} className="hover:text-brand-700">
            {deal.title}
          </Link>
        </h3>

        {deal.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{deal.description}</p>
        )}

        <div className="mt-2">
          <PriceLine deal={deal} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <VerifiedBadge verified={deal.verified} lastVerifiedAt={deal.lastVerifiedAt} />
          <ExpiryBadge expiresAt={deal.expiresAt} />
        </div>
      </div>

      <div className="w-full sm:w-48">
        <DealCta
          dealId={deal.id}
          type={deal.type}
          couponCode={deal.couponCode}
          merchantName={deal.merchant.name}
          src={src}
          terms={deal.terms}
          isDemo={deal.isDemo}
        />
      </div>
    </article>
  );
}
