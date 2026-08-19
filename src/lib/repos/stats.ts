import { getDb, type Db } from "../db/client";
import { clicksByChannel, clicksByMerchant, clicksSince, sourcePerformance, totalClicks } from "./clicks";
import { countSubmissions } from "./submissions";
import { countAlerts } from "./alerts";
import { listDeals } from "./deals";
import { feedbackTotals } from "./feedback";
import type { ScoredDeal } from "../db/mappers";

export interface DashboardMetrics {
  activeDeals: number;
  activeCoupons: number;
  activeNonCodeDeals: number;
  expiredOffers: number;
  pendingOffers: number;
  disabledOffers: number;
  merchants: number;
  activeMerchants: number;
  verifiedActive: number;
  totalClicks: number;
  clicksToday: number;
  clicksLast7Days: number;
  pendingSubmissions: number;
  alertSubscriptions: number;
  feedback: { yes: number; no: number };
  demoDeals: number;
  endingSoon: number;
}

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function dashboardMetrics(db: Db = getDb()): DashboardMetrics {
  const counts = db
    .prepare<unknown[], {
      activeDeals: number;
      activeCoupons: number;
      expired: number;
      pending: number;
      disabled: number;
      verifiedActive: number;
      demo: number;
      endingSoon: number;
    }>(
      `SELECT
         COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)                                  AS activeDeals,
         COUNT(CASE WHEN status = 'ACTIVE' AND type = 'PROMO_CODE' THEN 1 END)          AS activeCoupons,
         COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END)                                 AS expired,
         COUNT(CASE WHEN status = 'PENDING' THEN 1 END)                                 AS pending,
         COUNT(CASE WHEN status = 'DISABLED' THEN 1 END)                                AS disabled,
         COUNT(CASE WHEN status = 'ACTIVE' AND verified = 1 THEN 1 END)                  AS verifiedActive,
         COUNT(CASE WHEN is_demo = 1 THEN 1 END)                                        AS demo,
         COUNT(CASE WHEN status = 'ACTIVE' AND expires_at IS NOT NULL
                     AND expires_at <= ? THEN 1 END)                                    AS endingSoon
       FROM deals`,
    )
    .get(new Date(Date.now() + 3 * 86_400_000).toISOString());

  const merchantCounts = db
    .prepare<unknown[], { total: number; active: number }>(
      `SELECT COUNT(*) AS total, COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active FROM merchants`,
    )
    .get();

  const today = startOfTodayUtc();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  return {
    activeDeals: counts?.activeDeals ?? 0,
    activeCoupons: counts?.activeCoupons ?? 0,
    activeNonCodeDeals: (counts?.activeDeals ?? 0) - (counts?.activeCoupons ?? 0),
    expiredOffers: counts?.expired ?? 0,
    pendingOffers: counts?.pending ?? 0,
    disabledOffers: counts?.disabled ?? 0,
    merchants: merchantCounts?.total ?? 0,
    activeMerchants: merchantCounts?.active ?? 0,
    verifiedActive: counts?.verifiedActive ?? 0,
    totalClicks: totalClicks(db),
    clicksToday: clicksSince(today, db),
    clicksLast7Days: clicksSince(weekAgo, db),
    pendingSubmissions: countSubmissions("PENDING", db),
    alertSubscriptions: countAlerts(db),
    feedback: feedbackTotals(db),
    demoDeals: counts?.demo ?? 0,
    endingSoon: counts?.endingSoon ?? 0,
  };
}

export interface AdminOverview {
  metrics: DashboardMetrics;
  mostClickedDeals: ScoredDeal[];
  popularMerchants: ReturnType<typeof clicksByMerchant>;
  sources: ReturnType<typeof sourcePerformance>;
  channels: ReturnType<typeof clicksByChannel>;
}

export function adminOverview(db: Db = getDb()): AdminOverview {
  return {
    metrics: dashboardMetrics(db),
    mostClickedDeals: listDeals({ status: "ALL", sort: "popular", limit: 8 }, db).filter(
      (deal) => deal.clickCount > 0,
    ),
    popularMerchants: clicksByMerchant(8, db),
    sources: sourcePerformance(db),
    channels: clicksByChannel({}, db),
  };
}
