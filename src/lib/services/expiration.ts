import type { Database } from "better-sqlite3";

/**
 * Expiration is a pure database transition: ACTIVE deals whose `expires_at` is
 * in the past become EXPIRED. Expired rows are never deleted, so they stay
 * available for analytics and history.
 *
 * The function is deliberately free of framework imports so it can run from a
 * request, a script (`npm run deals:expire`) or a scheduled job hitting
 * `POST /api/cron/expire`.
 */
export function expireStaleDeals(db: Database, now: Date = new Date()): number {
  const result = db
    .prepare(
      `UPDATE deals
          SET status = 'EXPIRED', updated_at = ?
        WHERE status = 'ACTIVE'
          AND expires_at IS NOT NULL
          AND expires_at < ?`,
    )
    .run(now.toISOString(), now.toISOString());

  return result.changes;
}

/**
 * Re-activates deals that were expired but have since had their expiry pushed
 * into the future (for example by a feed update or an admin edit).
 */
export function reactivateExtendedDeals(db: Database, now: Date = new Date()): number {
  const result = db
    .prepare(
      `UPDATE deals
          SET status = 'ACTIVE', updated_at = ?
        WHERE status = 'EXPIRED'
          AND (expires_at IS NULL OR expires_at > ?)`,
    )
    .run(now.toISOString(), now.toISOString());

  return result.changes;
}

export interface ExpirationSweepResult {
  expired: number;
  reactivated: number;
  ranAt: string;
}

export function runExpirationSweep(db: Database, now: Date = new Date()): ExpirationSweepResult {
  return {
    expired: expireStaleDeals(db, now),
    reactivated: reactivateExtendedDeals(db, now),
    ranAt: now.toISOString(),
  };
}

/** True when the stored expiry is in the past. Missing expiry means "no end date". */
export function isExpired(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < now.getTime();
}
