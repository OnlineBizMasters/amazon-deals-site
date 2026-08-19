import { daysSince, daysUntil } from "../utils/format";
import type { Deal, Merchant } from "../domain/types";

/**
 * Deal Score (0-100).
 *
 * The score is a weighted sum of independent signal functions. Each signal
 * returns 0-1 and is only fed by data actually stored on the record, so a sparse
 * deal simply scores lower rather than borrowing invented popularity.
 *
 * Add or reweight a signal by editing `SIGNALS` — nothing else needs to change.
 */

export interface ScoreInput {
  deal: Pick<
    Deal,
    | "discountPercent"
    | "discountAmount"
    | "originalPrice"
    | "salePrice"
    | "verified"
    | "lastVerifiedAt"
    | "createdAt"
    | "expiresAt"
    | "clickCount"
    | "workedYes"
    | "workedNo"
    | "trending"
    | "featured"
    | "couponCode"
    | "description"
  >;
  merchant?: Pick<Merchant, "qualityScore" | "featured"> | null;
  /** Highest click count across the catalogue, used to scale engagement. */
  maxClickCount?: number;
  now?: Date;
}

export interface Signal {
  key: string;
  label: string;
  weight: number;
  /** Returns 0-1, or null when the underlying data is not available. */
  evaluate: (input: ScoreInput) => number | null;
}

/** Effective discount percentage, derived from prices when not stored directly. */
export function effectiveDiscountPercent(deal: {
  discountPercent: number | null;
  originalPrice: number | null;
  salePrice: number | null;
}): number | null {
  if (typeof deal.discountPercent === "number" && deal.discountPercent > 0) {
    return Math.min(deal.discountPercent, 100);
  }
  if (
    typeof deal.originalPrice === "number" &&
    typeof deal.salePrice === "number" &&
    deal.originalPrice > 0 &&
    deal.originalPrice > deal.salePrice
  ) {
    return Math.min(((deal.originalPrice - deal.salePrice) / deal.originalPrice) * 100, 100);
  }
  return null;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export const SIGNALS: Signal[] = [
  {
    key: "discount",
    label: "Discount strength",
    weight: 26,
    evaluate: ({ deal }) => {
      const percent = effectiveDiscountPercent(deal);
      if (percent !== null) {
        // 70%+ off saturates the signal.
        return clamp01(percent / 70);
      }
      if (typeof deal.discountAmount === "number" && deal.discountAmount > 0) {
        return clamp01(deal.discountAmount / 200);
      }
      return null;
    },
  },
  {
    key: "verified",
    label: "Verified status",
    weight: 18,
    evaluate: ({ deal, now = new Date() }) => {
      if (!deal.verified) return 0;
      const age = daysSince(deal.lastVerifiedAt, now);
      if (age === null) return 0.6;
      if (age <= 2) return 1;
      if (age <= 7) return 0.85;
      if (age <= 21) return 0.6;
      if (age <= 60) return 0.35;
      return 0.15;
    },
  },
  {
    key: "freshness",
    label: "Freshness",
    weight: 14,
    evaluate: ({ deal, now = new Date() }) => {
      const age = daysSince(deal.createdAt, now);
      if (age === null) return null;
      if (age <= 1) return 1;
      if (age <= 3) return 0.85;
      if (age <= 7) return 0.7;
      if (age <= 21) return 0.5;
      if (age <= 60) return 0.3;
      return 0.1;
    },
  },
  {
    key: "urgency",
    label: "Expiration urgency",
    weight: 8,
    evaluate: ({ deal, now = new Date() }) => {
      const days = daysUntil(deal.expiresAt, now);
      if (days === null) return null;
      if (days < 0) return 0;
      if (days <= 1) return 1;
      if (days <= 3) return 0.85;
      if (days <= 7) return 0.65;
      if (days <= 30) return 0.4;
      return 0.2;
    },
  },
  {
    key: "engagement",
    label: "Click-through activity",
    weight: 14,
    evaluate: ({ deal, maxClickCount = 0 }) => {
      if (deal.clickCount <= 0) return null;
      const ceiling = Math.max(maxClickCount, 10);
      // Log scale so a handful of clicks still registers without a single
      // outlier dominating the catalogue.
      return clamp01(Math.log10(1 + deal.clickCount) / Math.log10(1 + ceiling));
    },
  },
  {
    key: "feedback",
    label: 'User "worked" feedback',
    weight: 10,
    evaluate: ({ deal }) => {
      const total = deal.workedYes + deal.workedNo;
      if (total <= 0) return null;
      // Laplace-smoothed success rate: low-volume feedback stays near neutral.
      const rate = (deal.workedYes + 1) / (total + 2);
      const confidence = clamp01(total / 10);
      return clamp01(0.5 + (rate - 0.5) * (0.4 + 0.6 * confidence));
    },
  },
  {
    key: "merchant",
    label: "Merchant quality",
    weight: 6,
    evaluate: ({ merchant }) => {
      if (!merchant) return null;
      const base = clamp01((merchant.qualityScore ?? 50) / 100);
      return merchant.featured ? clamp01(base + 0.1) : base;
    },
  },
  {
    key: "editorial",
    label: "Editorial flags",
    weight: 4,
    evaluate: ({ deal }) => {
      if (deal.featured && deal.trending) return 1;
      if (deal.featured || deal.trending) return 0.7;
      return null;
    },
  },
];

export interface ScoreBreakdownEntry {
  key: string;
  label: string;
  weight: number;
  /** null when the deal has no data for this signal. */
  value: number | null;
  points: number;
}

export interface DealScoreResult {
  score: number;
  breakdown: ScoreBreakdownEntry[];
  /** Share of the total possible weight that had usable data (0-1). */
  dataCoverage: number;
}

/**
 * Signals with no data are excluded from both numerator and denominator, so the
 * score reflects the evidence that exists instead of penalising sparse records
 * into meaninglessness. `dataCoverage` reports how much evidence there was.
 */
export function scoreDeal(input: ScoreInput): DealScoreResult {
  const breakdown: ScoreBreakdownEntry[] = [];
  let earned = 0;
  let availableWeight = 0;
  let totalWeight = 0;

  for (const signal of SIGNALS) {
    totalWeight += signal.weight;
    const raw = signal.evaluate(input);
    if (raw === null) {
      breakdown.push({ key: signal.key, label: signal.label, weight: signal.weight, value: null, points: 0 });
      continue;
    }
    const value = clamp01(raw);
    const points = value * signal.weight;
    earned += points;
    availableWeight += signal.weight;
    breakdown.push({ key: signal.key, label: signal.label, weight: signal.weight, value, points });
  }

  const score = availableWeight === 0 ? 0 : Math.round((earned / availableWeight) * 100);

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
    dataCoverage: totalWeight === 0 ? 0 : availableWeight / totalWeight,
  };
}

/**
 * Whether stored signals support publicly labelling a deal as trending.
 * An administrator can always force the label via the `trending` flag; otherwise
 * real click and feedback volume is required. Nothing here fabricates activity.
 */
export function qualifiesAsTrending(
  deal: Pick<Deal, "trending" | "clickCount" | "workedYes" | "workedNo" | "status">,
  options: { minClicks?: number } = {},
): boolean {
  if (deal.status !== "ACTIVE") return false;
  if (deal.trending) return true;
  const minClicks = options.minClicks ?? 25;
  return deal.clickCount >= minClicks && deal.workedYes >= deal.workedNo;
}
