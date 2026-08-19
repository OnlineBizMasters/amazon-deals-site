import Link from "next/link";
import MerchantLogo from "@/components/merchants/MerchantLogo";
import DealCta from "./DealCta";
import {
  DemoBadge,
  DiscountBadge,
  ExpiryBadge,
  PriceLine,
  TrendingBadge,
  TypeBadge,
  VerifiedBadge,
} from "./DealMeta";
import type { ScoredDeal } from "@/lib/db/mappers";

interface DealCardProps {
  deal: ScoredDeal;
  /** Campaign parameter passed through to the tracked link. */
  src?: string | null;
  /** Hides the merchant row on pages that are already scoped to one merchant. */
  hideMerchant?: boolean;
}

export default function DealCard({ deal, src, hideMerchant = false }: DealCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      {!hideMerchant && (
        <div className="flex items-center gap-3">
          <MerchantLogo name={deal.merchant.name} logo={deal.merchant.logo} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/coupons/${deal.merchant.slug}`}
              className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-700"
            >
              {deal.merchant.name}
            </Link>
            {deal.category && <p className="truncate text-xs text-slate-500">{deal.category}</p>}
          </div>
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-1.5 ${hideMerchant ? "" : "mt-3"}`}>
        <TypeBadge type={deal.type} />
        <DiscountBadge deal={deal} />
        <TrendingBadge deal={deal} />
        <DemoBadge isDemo={deal.isDemo} />
      </div>

      <h3 className="mt-3 text-base font-bold leading-snug text-slate-900">
        <Link href={`/deal/${deal.slug}`} className="hover:text-brand-700">
          {deal.title}
        </Link>
      </h3>

      {deal.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{deal.description}</p>
      )}

      <div className="mt-2">
        <PriceLine deal={deal} />
      </div>

      <div className="mt-auto pt-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <VerifiedBadge verified={deal.verified} lastVerifiedAt={deal.lastVerifiedAt} />
          <ExpiryBadge expiresAt={deal.expiresAt} />
        </div>

        <DealCta
          dealId={deal.id}
          type={deal.type}
          couponCode={deal.couponCode}
          merchantName={deal.merchant.name}
          src={src}
          terms={deal.terms}
          isDemo={deal.isDemo}
        />

        <p className="mt-2 text-center text-[11px] text-slate-400">
          <Link href={`/deal/${deal.slug}`} className="hover:text-slate-600 hover:underline">
            Deal details
          </Link>
        </p>
      </div>
    </article>
  );
}

export function DealGrid({
  deals,
  src,
  hideMerchant,
  columns = 4,
}: {
  deals: ScoredDeal[];
  src?: string | null;
  hideMerchant?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const columnClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns];

  return (
    <div className={`grid grid-cols-1 gap-4 ${columnClass}`}>
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} src={src} hideMerchant={hideMerchant} />
      ))}
    </div>
  );
}
