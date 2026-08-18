import { getDb, newId, nowIso, type Db } from "../db/client";
import { mapSubmission, type SubmissionRow } from "../db/mappers";
import { createDeal } from "./deals";
import { ensureMerchant, findMerchantByName } from "./merchants";
import { normalizeUrl } from "../utils/url";
import type { DealSubmission, SubmissionStatus } from "../domain/types";

export interface SubmissionInput {
  merchantName: string;
  couponCode?: string | null;
  description: string;
  destinationUrl: string;
  expiresAt?: string | null;
}

/**
 * Every visitor submission lands in PENDING and is invisible to the public site
 * until an administrator approves it.
 */
export function createSubmission(input: SubmissionInput, db: Db = getDb()): DealSubmission {
  const id = newId();
  const createdAt = nowIso();
  const merchant = findMerchantByName(input.merchantName, db);

  db.prepare(
    `INSERT INTO deal_submissions (
       id, merchant_name, merchant_id, coupon_code, description, destination_url,
       expires_at, status, reviewer_notes, created_deal_id, created_at, reviewed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, NULL, ?, NULL)`,
  ).run(
    id,
    input.merchantName.trim(),
    merchant?.id ?? null,
    input.couponCode?.trim().toUpperCase() || null,
    input.description.trim(),
    normalizeUrl(input.destinationUrl) ?? input.destinationUrl.trim(),
    input.expiresAt ?? null,
    createdAt,
  );

  return getSubmission(id, db)!;
}

export function getSubmission(id: string, db: Db = getDb()): DealSubmission | null {
  const row = db
    .prepare<unknown[], SubmissionRow>("SELECT * FROM deal_submissions WHERE id = ?")
    .get(id);
  return row ? mapSubmission(row) : null;
}

export function listSubmissions(
  options: { status?: SubmissionStatus | "ALL"; limit?: number } = {},
  db: Db = getDb(),
): DealSubmission[] {
  const status = options.status ?? "PENDING";
  const where = status === "ALL" ? "" : "WHERE status = ?";
  const params = status === "ALL" ? [] : [status];

  return db
    .prepare<unknown[], SubmissionRow>(
      `SELECT * FROM deal_submissions ${where} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...params, options.limit ?? 100)
    .map(mapSubmission);
}

export function countSubmissions(status: SubmissionStatus = "PENDING", db: Db = getDb()): number {
  const row = db
    .prepare<unknown[], { count: number }>(
      "SELECT COUNT(*) AS count FROM deal_submissions WHERE status = ?",
    )
    .get(status);
  return row?.count ?? 0;
}

/**
 * Approving a submission creates a real deal record, attributed to the
 * USER_SUBMISSION source so its provenance stays visible in analytics.
 */
export function approveSubmission(
  id: string,
  options: { notes?: string | null; verified?: boolean } = {},
  db: Db = getDb(),
): { submission: DealSubmission; dealId: string } | null {
  const submission = getSubmission(id, db);
  if (!submission || submission.status !== "PENDING") return null;

  const { merchant } = ensureMerchant({ name: submission.merchantName }, db);

  const deal = createDeal(
    {
      merchantId: merchant.id,
      title: submission.description.slice(0, 120),
      description: submission.description,
      type: submission.couponCode ? "PROMO_CODE" : "DEAL",
      couponCode: submission.couponCode,
      destinationUrl: submission.destinationUrl,
      expiresAt: submission.expiresAt,
      status: "ACTIVE",
      source: "USER_SUBMISSION",
      verified: options.verified ?? false,
    },
    db,
  );

  db.prepare(
    `UPDATE deal_submissions
        SET status = 'APPROVED', reviewer_notes = ?, created_deal_id = ?, reviewed_at = ?
      WHERE id = ?`,
  ).run(options.notes?.trim() || null, deal.id, nowIso(), id);

  return { submission: getSubmission(id, db)!, dealId: deal.id };
}

export function rejectSubmission(
  id: string,
  notes?: string | null,
  db: Db = getDb(),
): DealSubmission | null {
  db.prepare(
    "UPDATE deal_submissions SET status = 'REJECTED', reviewer_notes = ?, reviewed_at = ? WHERE id = ?",
  ).run(notes?.trim() || null, nowIso(), id);
  return getSubmission(id, db);
}
