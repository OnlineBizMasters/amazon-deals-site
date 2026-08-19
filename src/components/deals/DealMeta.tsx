import Badge from "@/components/ui/Badge";
import { discountLabel, expiryLabel, formatDate, formatMoney, relativeTime } from "@/lib/utils/format";
import { qualifiesAsTrending } from "@/lib/services/deal-score";
import type { ScoredDeal } from "@/lib/db/mappers";

/**
 * Shared deal chrome: discount, type, verification, expiry and demo labelling.
 * Every element renders only when the underlying field exists — nothing is
 * inferred, and no urgency is displayed without a stored expiry date.
 */

export function DiscountBadge({ deal }: { deal: ScoredDeal }) {
  const label = discountLabel(deal);
  if (!label) return null;
  return (
    <Badge tone="savings" className="text-xs">
      {label}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: "PROMO_CODE" | "DEAL" }) {
  return type === "PROMO_CODE" ? (
    <Badge tone="brand">Promo code</Badge>
  ) : (
    <Badge tone="neutral">Deal</Badge>
  );
}

export function VerifiedBadge({
  verified,
  lastVerifiedAt,
}: {
  verified: boolean;
  lastVerifiedAt: string | null;
}) {
  if (!verified) {
    return (
      <Badge tone="neutral" title="This offer has not been checked by our team.">
        Not verified
      </Badge>
    );
  }

  const when = relativeTime(lastVerifiedAt);
  return (
    <Badge tone="verified" title={lastVerifiedAt ? `Checked ${formatDate(lastVerifiedAt)}` : undefined}>
      ✓ Verified{when ? ` ${when}` : ""}
    </Badge>
  );
}

export function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const label = expiryLabel(expiresAt);
  if (!label) return null;

  const soon = label === "Expires today" || label === "Expires tomorrow";
  return <Badge tone={soon ? "urgent" : "neutral"}>{label}</Badge>;
}

export function DemoBadge({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) return null;
  return (
    <Badge tone="demo" title="Seeded sample data for testing — not a live offer.">
      Sample data
    </Badge>
  );
}

export function TrendingBadge({ deal }: { deal: ScoredDeal }) {
  // Only shown when an administrator set the flag or real click/feedback volume
  // supports it.
  if (!qualifiesAsTrending(deal)) return null;
  return <Badge tone="urgent">Trending</Badge>;
}

export function PriceLine({ deal }: { deal: ScoredDeal }) {
  const sale = formatMoney(deal.salePrice, deal.currency);
  const original = formatMoney(deal.originalPrice, deal.currency);
  if (!sale && !original) return null;

  return (
    <p className="flex items-baseline gap-2">
      {sale && <span className="text-lg font-extrabold text-slate-900">{sale}</span>}
      {original && deal.originalPrice !== deal.salePrice && (
        <span className="text-sm text-slate-400 line-through">{original}</span>
      )}
    </p>
  );
}
