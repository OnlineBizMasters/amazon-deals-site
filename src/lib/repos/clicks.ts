import { getDb, newId, nowIso, type Db } from "../db/client";
import { incrementClickCount } from "./deals";
import { classifyChannel, normalizeSrc } from "../services/analytics-channels";
import { referrerHost } from "../utils/url";
import type { TrafficChannel } from "../domain/types";

export interface RecordClickInput {
  dealId: string;
  merchantId: string;
  /** Raw `src` query parameter, e.g. `youtube`. */
  src?: string | null;
  /** Raw referrer header; only its hostname is stored. */
  referrer?: string | null;
  /** Hostname of this site, used to tell internal navigation from external referrals. */
  selfHost?: string | null;
}

export interface RecordedClick {
  id: string;
  channel: TrafficChannel;
  createdAt: string;
}

/**
 * Records one outbound click. Deliberately stores no IP address, user agent,
 * cookie or full referrer URL — only the deal, the merchant, the campaign `src`
 * value, a coarse channel and the referrer hostname.
 */
export function recordClick(input: RecordClickInput, db: Db = getDb()): RecordedClick {
  const id = newId();
  const createdAt = nowIso();
  const src = normalizeSrc(input.src);
  const host = referrerHost(input.referrer);
  const sameHost = Boolean(host && input.selfHost && host === input.selfHost.replace(/^www\./, ""));
  const channel = classifyChannel(src, host, sameHost);

  db.transaction(() => {
    db.prepare(
      `INSERT INTO clicks (id, deal_id, merchant_id, src, channel, referrer_host, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.dealId, input.merchantId, src, channel, host, createdAt);
    incrementClickCount(input.dealId, db);
  })();

  return { id, channel, createdAt };
}

export function totalClicks(db: Db = getDb()): number {
  const row = db.prepare<unknown[], { count: number }>("SELECT COUNT(*) AS count FROM clicks").get();
  return row?.count ?? 0;
}

export function clicksSince(sinceIso: string, db: Db = getDb()): number {
  const row = db
    .prepare<unknown[], { count: number }>("SELECT COUNT(*) AS count FROM clicks WHERE created_at >= ?")
    .get(sinceIso);
  return row?.count ?? 0;
}

export interface ChannelBreakdownRow {
  channel: TrafficChannel;
  clicks: number;
  deals: number;
}

export function clicksByChannel(
  options: { sinceIso?: string } = {},
  db: Db = getDb(),
): ChannelBreakdownRow[] {
  const where = options.sinceIso ? "WHERE created_at >= ?" : "";
  const params = options.sinceIso ? [options.sinceIso] : [];

  return db
    .prepare<unknown[], ChannelBreakdownRow>(
      `SELECT channel,
              COUNT(*) AS clicks,
              COUNT(DISTINCT deal_id) AS deals
         FROM clicks ${where}
        GROUP BY channel
        ORDER BY clicks DESC`,
    )
    .all(...params);
}

export interface SrcBreakdownRow {
  src: string | null;
  channel: TrafficChannel;
  clicks: number;
}

export function clicksBySrc(
  options: { sinceIso?: string; limit?: number } = {},
  db: Db = getDb(),
): SrcBreakdownRow[] {
  const where = options.sinceIso ? "WHERE created_at >= ?" : "";
  const params = options.sinceIso ? [options.sinceIso] : [];

  return db
    .prepare<unknown[], SrcBreakdownRow>(
      `SELECT src, channel, COUNT(*) AS clicks
         FROM clicks ${where}
        GROUP BY src, channel
        ORDER BY clicks DESC
        LIMIT ?`,
    )
    .all(...params, options.limit ?? 25);
}

export interface DailyClickRow {
  day: string;
  clicks: number;
}

export function clicksPerDay(days = 14, db: Db = getDb()): DailyClickRow[] {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return db
    .prepare<unknown[], DailyClickRow>(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS clicks
         FROM clicks
        WHERE created_at >= ?
        GROUP BY day
        ORDER BY day ASC`,
    )
    .all(since);
}

export interface MerchantClickRow {
  merchantId: string;
  name: string;
  slug: string;
  clicks: number;
}

export function clicksByMerchant(limit = 10, db: Db = getDb()): MerchantClickRow[] {
  return db
    .prepare<unknown[], MerchantClickRow>(
      `SELECT m.id AS merchantId, m.name AS name, m.slug AS slug, COUNT(c.id) AS clicks
         FROM merchants m
         JOIN clicks c ON c.merchant_id = m.id
        GROUP BY m.id
        ORDER BY clicks DESC
        LIMIT ?`,
    )
    .all(limit);
}

export interface SourcePerformanceRow {
  source: string;
  deals: number;
  activeDeals: number;
  clicks: number;
  verified: number;
}

/** Compares offer sources (CSV, MANUAL, CJ, …) by catalogue size and clicks. */
export function sourcePerformance(db: Db = getDb()): SourcePerformanceRow[] {
  return db
    .prepare<unknown[], SourcePerformanceRow>(
      `SELECT d.source AS source,
              COUNT(*) AS deals,
              COUNT(CASE WHEN d.status = 'ACTIVE' THEN 1 END) AS activeDeals,
              COALESCE(SUM(d.click_count), 0) AS clicks,
              COUNT(CASE WHEN d.verified = 1 THEN 1 END) AS verified
         FROM deals d
        GROUP BY d.source
        ORDER BY clicks DESC, deals DESC`,
    )
    .all();
}
