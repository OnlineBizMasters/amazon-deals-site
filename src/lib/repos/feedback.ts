import { getDb, newId, nowIso, toDbBool, type Db } from "../db/client";
import { mapFeedback, type FeedbackRow } from "../db/mappers";
import { recomputeDealScore, recordWorkedFeedback } from "./deals";
import type { DealFeedback } from "../domain/types";

/**
 * Stores a "did this code work?" vote. The vote is a quality signal only: it
 * feeds the Deal Score and admin review queues, and never sets the `verified`
 * flag on its own.
 */
export function recordDealFeedback(
  dealId: string,
  worked: boolean,
  db: Db = getDb(),
): DealFeedback {
  const id = newId();
  const createdAt = nowIso();

  db.transaction(() => {
    db.prepare("INSERT INTO deal_feedback (id, deal_id, worked, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      dealId,
      toDbBool(worked),
      createdAt,
    );
    recordWorkedFeedback(dealId, worked, db);
  })();

  recomputeDealScore(dealId, db);

  return { id, dealId, worked, createdAt };
}

export function recentFeedback(limit = 50, db: Db = getDb()): DealFeedback[] {
  return db
    .prepare<unknown[], FeedbackRow>(
      "SELECT * FROM deal_feedback ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit)
    .map(mapFeedback);
}

export interface FeedbackTotals {
  yes: number;
  no: number;
}

export function feedbackTotals(db: Db = getDb()): FeedbackTotals {
  const row = db
    .prepare<unknown[], { yes: number; no: number }>(
      `SELECT COUNT(CASE WHEN worked = 1 THEN 1 END) AS yes,
              COUNT(CASE WHEN worked = 0 THEN 1 END) AS no
         FROM deal_feedback`,
    )
    .get();
  return { yes: row?.yes ?? 0, no: row?.no ?? 0 };
}
