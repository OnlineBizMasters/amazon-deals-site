/**
 * Expiration sweep, intended for a cron job or scheduled task:
 *
 *   npm run deals:expire
 *
 * Flips ACTIVE offers whose stored expiry has passed to EXPIRED (and restores any
 * whose expiry was pushed back), then recomputes Deal Scores so ranking reflects
 * the new state. Expired records are never deleted.
 */

import { getDb } from "../src/lib/db/client";
import { runExpirationSweep } from "../src/lib/services/expiration";
import { recomputeAllDealScores } from "../src/lib/repos/deals";

process.env.DEALSCOUT_AUTO_SEED = "0";

const db = getDb();
const result = runExpirationSweep(db);
const scored = recomputeAllDealScores(db);

console.log(
  `Expiration sweep at ${result.ranAt}: ${result.expired} expired, ${result.reactivated} reactivated, ${scored} deal score(s) recomputed.`,
);
