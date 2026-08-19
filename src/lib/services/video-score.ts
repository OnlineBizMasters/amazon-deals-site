import { daysSince, daysUntil } from "../utils/format";
import { effectiveDiscountPercent } from "./deal-score";
import type { Deal, Merchant } from "../domain/types";

/**
 * Content Potential Score (0-100) — how suitable a deal is as raw material for
 * short-form content, not a prediction that anything will go viral.
 *
 * It rewards a strong stored discount, genuine urgency, freshness, existing
 * engagement, and having enough structured fields to write an honest script.
 */

export interface VideoScoreInput {
  deal: Pick<
    Deal,
    | "title"
    | "description"
    | "discountPercent"
    | "discountAmount"
    | "originalPrice"
    | "salePrice"
    | "couponCode"
    | "type"
    | "expiresAt"
    | "createdAt"
    | "clickCount"
    | "workedYes"
    | "workedNo"
    | "verified"
    | "category"
  >;
  merchant?: Pick<Merchant, "name" | "qualityScore"> | null;
  maxClickCount?: number;
  now?: Date;
}

export interface VideoScoreResult {
  score: number;
  /** Plain-language reasons, safe to show an admin. */
  reasons: string[];
  /** Fields that would make better content if they were filled in. */
  missingData: string[];
  components: { key: string; label: string; weight: number; value: number }[];
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * How much structured information exists to build a script from. Content that
 * cannot be written from stored data should not be produced at all, so this acts
 * as a gate rather than a bonus.
 */
export function contentDataCompleteness(input: VideoScoreInput): { value: number; missing: string[] } {
  const { deal, merchant } = input;
  const checks: { ok: boolean; label: string }[] = [
    { ok: Boolean(merchant?.name), label: "merchant name" },
    { ok: deal.title.trim().length >= 12, label: "descriptive title" },
    { ok: Boolean(deal.description && deal.description.trim().length >= 30), label: "description" },
    { ok: effectiveDiscountPercent(deal) !== null || typeof deal.discountAmount === "number", label: "discount value" },
    { ok: typeof deal.salePrice === "number", label: "sale price" },
    { ok: Boolean(deal.category), label: "category" },
    { ok: deal.type === "DEAL" || Boolean(deal.couponCode), label: "coupon code" },
  ];

  const ok = checks.filter((check) => check.ok).length;
  return {
    value: ok / checks.length,
    missing: checks.filter((check) => !check.ok).map((check) => check.label),
  };
}

export function scoreVideoPotential(input: VideoScoreInput): VideoScoreResult {
  const now = input.now ?? new Date();
  const { deal } = input;
  const reasons: string[] = [];

  const discountPercent = effectiveDiscountPercent(deal);
  let discountSignal = 0;
  if (discountPercent !== null) {
    discountSignal = clamp01(discountPercent / 60);
    if (discountPercent >= 50) reasons.push(`Stored discount of ${Math.round(discountPercent)}% is a strong hook`);
    else if (discountPercent >= 30) reasons.push(`Stored discount of ${Math.round(discountPercent)}% is usable as a hook`);
  } else if (typeof deal.discountAmount === "number" && deal.discountAmount > 0) {
    discountSignal = clamp01(deal.discountAmount / 150);
    reasons.push("Absolute saving is stored, percentage is not");
  }

  const daysLeft = daysUntil(deal.expiresAt, now);
  let urgencySignal = 0;
  if (daysLeft !== null && daysLeft >= 0) {
    if (daysLeft <= 2) {
      urgencySignal = 1;
      reasons.push(`Expires in ${daysLeft <= 0 ? "under a day" : `${daysLeft} day(s)`} — real deadline to mention`);
    } else if (daysLeft <= 7) {
      urgencySignal = 0.75;
      reasons.push(`Expires in ${daysLeft} days`);
    } else if (daysLeft <= 30) {
      urgencySignal = 0.45;
    } else {
      urgencySignal = 0.25;
    }
  }

  const age = daysSince(deal.createdAt, now);
  let freshnessSignal = 0;
  if (age !== null) {
    if (age <= 2) {
      freshnessSignal = 1;
      reasons.push("Added in the last 48 hours");
    } else if (age <= 7) freshnessSignal = 0.75;
    else if (age <= 21) freshnessSignal = 0.5;
    else if (age <= 60) freshnessSignal = 0.25;
    else freshnessSignal = 0.05;
  }

  const ceiling = Math.max(input.maxClickCount ?? 0, 10);
  const engagementSignal =
    deal.clickCount > 0 ? clamp01(Math.log10(1 + deal.clickCount) / Math.log10(1 + ceiling)) : 0;
  if (deal.clickCount > 0) {
    reasons.push(`${deal.clickCount.toLocaleString("en-US")} recorded click(s) on this deal`);
  }

  const feedbackTotal = deal.workedYes + deal.workedNo;
  const feedbackSignal = feedbackTotal > 0 ? clamp01((deal.workedYes + 1) / (feedbackTotal + 2)) : 0;
  if (deal.workedYes > 0) {
    reasons.push(`${deal.workedYes} user(s) reported this worked`);
  }
  if (deal.workedNo > deal.workedYes && feedbackTotal >= 3) {
    reasons.push("More users reported it failed than worked — check before filming");
  }

  const completeness = contentDataCompleteness(input);
  if (deal.verified) reasons.push("Marked verified in the database");

  const components = [
    { key: "discount", label: "Discount strength", weight: 30, value: discountSignal },
    { key: "urgency", label: "Urgency", weight: 18, value: urgencySignal },
    { key: "freshness", label: "Freshness", weight: 16, value: freshnessSignal },
    { key: "engagement", label: "Existing engagement", weight: 12, value: engagementSignal },
    { key: "feedback", label: "Worked feedback", weight: 6, value: feedbackSignal },
    { key: "completeness", label: "Usable stored detail", weight: 18, value: completeness.value },
  ];

  const total = components.reduce((sum, component) => sum + component.weight, 0);
  const earned = components.reduce((sum, component) => sum + component.value * component.weight, 0);

  return {
    score: Math.round((earned / total) * 100),
    reasons,
    missingData: completeness.missing,
    components,
  };
}

/**
 * Warnings an admin must see before turning a deal into content. Discount-led
 * titles and thumbnails go stale as soon as the offer changes, so we say so.
 */
export function contentWarnings(input: VideoScoreInput): string[] {
  const now = input.now ?? new Date();
  const { deal } = input;
  const warnings: string[] = [];
  const discountPercent = effectiveDiscountPercent(deal);
  const daysLeft = daysUntil(deal.expiresAt, now);

  if (discountPercent !== null && daysLeft !== null) {
    warnings.push(
      `This deal has a stored expiry (${daysLeft < 0 ? "already passed" : `${daysLeft} day(s) left`}). Discount-based titles and thumbnail text can become inaccurate after that date.`,
    );
  } else if (discountPercent !== null) {
    warnings.push(
      "Discount-based titles and thumbnail text can become inaccurate if the merchant changes the price. Re-check before publishing.",
    );
  }

  if (deal.type === "PROMO_CODE" && !deal.couponCode) {
    warnings.push("This is a promo-code deal with no stored code — do not promise a code in the content.");
  }

  if (!deal.verified) {
    warnings.push("This deal is not marked verified. Avoid claiming it is verified in the script or caption.");
  }

  if (deal.workedNo > deal.workedYes && deal.workedNo >= 2) {
    warnings.push("Recent user feedback skews negative. Confirm the offer still works before publishing.");
  }

  return warnings;
}
