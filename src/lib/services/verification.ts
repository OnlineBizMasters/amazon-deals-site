import type { Deal } from "../domain/types";
import { daysSince } from "../utils/format";

/**
 * Verification policy.
 *
 * V1 verification is **manual**: an administrator marks a deal verified and the
 * timestamp is recorded. There is no automated checker in this release, and the
 * UI must never imply otherwise.
 *
 * `AutomatedVerifier` is the seam for future, legitimate automation (a merchant
 * or network API confirming an offer is still live). Nothing implements it yet.
 */

export const VERIFICATION_MODE_MANUAL = "manual" as const;

export interface VerificationOutcome {
  verified: boolean;
  checkedAt: string;
  /** Which mechanism produced the outcome. */
  method: "manual" | "network_api" | "merchant_api";
  note?: string;
}

export interface AutomatedVerifier {
  id: string;
  label: string;
  /** False until credentials and a real integration exist. */
  isConfigured(): boolean;
  verify(deal: Deal): Promise<VerificationOutcome>;
}

/** No automated verifiers ship in V1. */
export const AUTOMATED_VERIFIERS: AutomatedVerifier[] = [];

export function automatedVerificationAvailable(): boolean {
  return AUTOMATED_VERIFIERS.some((verifier) => verifier.isConfigured());
}

/** Age thresholds used to describe how recent a verification is. */
export type VerificationFreshness = "unverified" | "fresh" | "recent" | "stale";

export function verificationFreshness(
  deal: Pick<Deal, "verified" | "lastVerifiedAt">,
  now: Date = new Date(),
): VerificationFreshness {
  if (!deal.verified) return "unverified";
  const age = daysSince(deal.lastVerifiedAt, now);
  if (age === null) return "recent";
  if (age <= 3) return "fresh";
  if (age <= 14) return "recent";
  return "stale";
}

/**
 * User YES/NO votes are a quality signal only. They deliberately never set the
 * `verified` flag — that stays an editorial decision.
 */
export interface FeedbackSignal {
  total: number;
  successRate: number | null;
  /** Suggested admin action, not a public claim. */
  recommendation: "no_data" | "looks_healthy" | "needs_review" | "likely_broken";
}

export function feedbackSignal(deal: Pick<Deal, "workedYes" | "workedNo">): FeedbackSignal {
  const total = deal.workedYes + deal.workedNo;
  if (total === 0) {
    return { total: 0, successRate: null, recommendation: "no_data" };
  }

  const successRate = deal.workedYes / total;
  let recommendation: FeedbackSignal["recommendation"] = "needs_review";
  if (total >= 3 && successRate <= 0.34) recommendation = "likely_broken";
  else if (successRate >= 0.7) recommendation = "looks_healthy";

  return { total, successRate, recommendation };
}
