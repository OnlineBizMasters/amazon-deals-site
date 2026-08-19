/**
 * Database maintenance CLI.
 *
 *   npm run db:seed     — insert the demo catalogue (only when empty)
 *   npm run db:seed -- --force   — clear demo rows first, then re-seed
 *   npm run db:reset    — drop every row and re-seed
 *   npm run db:status   — print a summary of what is stored
 */

import { getDb } from "../src/lib/db/client";
import { clearDemoData, seedDemoData } from "../src/lib/seed/seed";
import { dashboardMetrics } from "../src/lib/repos/stats";
import { recomputeAllDealScores } from "../src/lib/repos/deals";

const command = process.argv[2] ?? "status";
const force = process.argv.includes("--force");

// Auto-seeding on first connection would race with these commands.
process.env.DEALSCOUT_AUTO_SEED = "0";

const db = getDb();

function printStatus(): void {
  const metrics = dashboardMetrics(db);
  console.log("DealScout database summary");
  console.log("──────────────────────────");
  console.table({
    merchants: metrics.merchants,
    activeDeals: metrics.activeDeals,
    activeCoupons: metrics.activeCoupons,
    expiredOffers: metrics.expiredOffers,
    pendingOffers: metrics.pendingOffers,
    disabledOffers: metrics.disabledOffers,
    demoRecords: metrics.demoDeals,
    totalClicks: metrics.totalClicks,
    alertSubscriptions: metrics.alertSubscriptions,
    pendingSubmissions: metrics.pendingSubmissions,
  });
}

switch (command) {
  case "seed": {
    const existing = db.prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM merchants").get();
    if ((existing?.count ?? 0) > 0 && !force) {
      console.log(
        "Database already contains merchants. Re-run with --force to clear demo rows and re-seed.",
      );
      printStatus();
      break;
    }

    if (force) {
      const cleared = clearDemoData(db);
      console.log(`Cleared ${cleared.deals} demo deal(s) and ${cleared.merchants} demo merchant(s).`);
    }

    const result = seedDemoData(db);
    recomputeAllDealScores(db);
    console.log(
      `Seeded ${result.merchants} merchants, ${result.deals} deals, ${result.clicks} clicks and ${result.feedback} feedback rows.`,
    );
    console.log("All seeded records are flagged as sample data and labelled in the UI.");
    printStatus();
    break;
  }

  case "reset": {
    db.exec(`
      DELETE FROM clicks;
      DELETE FROM deal_feedback;
      DELETE FROM deal_submissions;
      DELETE FROM deal_alerts;
      DELETE FROM import_batches;
      DELETE FROM deals;
      DELETE FROM merchants;
    `);
    const result = seedDemoData(db);
    recomputeAllDealScores(db);
    console.log(
      `Reset complete. Seeded ${result.merchants} merchants and ${result.deals} demo deals.`,
    );
    printStatus();
    break;
  }

  case "status":
    printStatus();
    break;

  default:
    console.error(`Unknown command "${command}". Use seed, reset or status.`);
    process.exit(1);
}
