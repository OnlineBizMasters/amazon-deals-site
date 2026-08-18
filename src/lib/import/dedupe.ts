import { getDb, type Db } from "../db/client";
import { urlDedupeKey } from "../utils/url";
import type { NormalizedOffer } from "./validate";
import type { OfferSource } from "../domain/types";

/**
 * Duplicate detection for imports.
 *
 * Four independent strategies, checked in order of confidence:
 *   1. same source + external id  → the same feed record, so update it
 *   2. same merchant + coupon code → the same code, do not duplicate
 *   3. same merchant + destination URL → the same landing page offer
 *   4. same merchant + type + near-identical title on a live deal
 */

export type DuplicateReason =
  | "source_external_id"
  | "merchant_coupon_code"
  | "merchant_destination_url"
  | "similar_active_deal";

export interface DuplicateMatch {
  dealId: string;
  title: string;
  slug: string;
  status: string;
  reason: DuplicateReason;
  /** 0-1, only meaningful for the similarity strategy. */
  similarity?: number;
}

export const DUPLICATE_REASON_LABELS: Record<DuplicateReason, string> = {
  source_external_id: "Same source + external ID",
  merchant_coupon_code: "Same merchant + coupon code",
  merchant_destination_url: "Same merchant + destination URL",
  similar_active_deal: "Near-identical active deal for this merchant",
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "to",
  "at",
  "on",
  "for",
  "with",
  "your",
  "you",
  "get",
  "save",
  "off",
  "now",
  "up",
  "extra",
  "plus",
]);

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9%$ ]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

/** Jaccard similarity over meaningful title tokens (0-1). */
export function titleSimilarity(a: string, b: string): number {
  const left = titleTokens(a);
  const right = titleTokens(b);
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const SIMILARITY_THRESHOLD = 0.82;

interface CandidateRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  type: string;
  coupon_code: string | null;
  destination_url: string;
}

/**
 * Finds an existing deal that the incoming offer duplicates. `merchantId` is
 * null for merchants that do not exist yet, in which case only the
 * source/external-id strategy can match.
 */
export function findDuplicate(
  offer: NormalizedOffer,
  merchantId: string | null,
  db: Db = getDb(),
): DuplicateMatch | null {
  if (offer.externalId) {
    const row = db
      .prepare<unknown[], CandidateRow>(
        `SELECT id, title, slug, status, type, coupon_code, destination_url
           FROM deals WHERE source = ? AND source_external_id = ? LIMIT 1`,
      )
      .get(offer.source satisfies OfferSource, offer.externalId);
    if (row) {
      return {
        dealId: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        reason: "source_external_id",
      };
    }
  }

  if (!merchantId) return null;

  const candidates = db
    .prepare<unknown[], CandidateRow>(
      `SELECT id, title, slug, status, type, coupon_code, destination_url
         FROM deals
        WHERE merchant_id = ? AND status IN ('ACTIVE', 'PENDING')`,
    )
    .all(merchantId);

  if (offer.couponCode) {
    const match = candidates.find(
      (candidate) => candidate.coupon_code?.toUpperCase() === offer.couponCode?.toUpperCase(),
    );
    if (match) {
      return {
        dealId: match.id,
        title: match.title,
        slug: match.slug,
        status: match.status,
        reason: "merchant_coupon_code",
      };
    }
  }

  const incomingUrlKey = urlDedupeKey(offer.destinationUrl);
  if (incomingUrlKey) {
    const match = candidates.find(
      (candidate) => urlDedupeKey(candidate.destination_url) === incomingUrlKey,
    );
    if (match) {
      return {
        dealId: match.id,
        title: match.title,
        slug: match.slug,
        status: match.status,
        reason: "merchant_destination_url",
      };
    }
  }

  let best: { candidate: CandidateRow; similarity: number } | null = null;
  for (const candidate of candidates) {
    if (candidate.type !== offer.type) continue;
    const similarity = titleSimilarity(candidate.title, offer.title);
    if (similarity >= SIMILARITY_THRESHOLD && (!best || similarity > best.similarity)) {
      best = { candidate, similarity };
    }
  }

  if (best) {
    return {
      dealId: best.candidate.id,
      title: best.candidate.title,
      slug: best.candidate.slug,
      status: best.candidate.status,
      reason: "similar_active_deal",
      similarity: Math.round(best.similarity * 100) / 100,
    };
  }

  return null;
}

/**
 * Keys used to spot rows that duplicate *each other* inside a single file, before
 * anything touches the database.
 */
export function withinBatchKeys(offer: NormalizedOffer): string[] {
  const keys: string[] = [];
  const merchant = offer.merchantName.toLowerCase().trim();

  if (offer.externalId) keys.push(`ext:${offer.source}:${offer.externalId.toLowerCase()}`);
  if (offer.couponCode) keys.push(`code:${merchant}:${offer.couponCode.toUpperCase()}`);

  const urlKey = urlDedupeKey(offer.destinationUrl);
  if (urlKey) keys.push(`url:${merchant}:${urlKey}`);

  return keys;
}
