import type { Database } from "better-sqlite3";
import { DEMO_CLICK_CHANNELS, DEMO_DEALS, DEMO_MERCHANTS } from "./demo-data";
import { scoreDeal } from "../services/deal-score";
import { classifyChannel } from "../services/analytics-channels";
import { slugify } from "../utils/slug";
import type { DealStatus } from "../domain/types";

/**
 * Inserts the demo catalogue.
 *
 * Written against the raw database handle (rather than the repositories) so the
 * database bootstrap can call it without a circular import. Deals are flagged
 * `is_demo = 1`; the public UI uses that flag to label them as sample data.
 */

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function endOfDayIso(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  date.setUTCHours(23, 59, 59, 0);
  return date.toISOString();
}

export interface SeedResult {
  merchants: number;
  deals: number;
  clicks: number;
  feedback: number;
}

export function seedDemoData(db: Database): SeedResult {
  const now = new Date();
  const nowIso = now.toISOString();

  const insertMerchant = db.prepare(
    `INSERT INTO merchants (
       id, name, slug, logo, website_url, affiliate_base_url, description, category,
       status, featured, quality_score, network, is_demo, created_at, updated_at
     ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 1, ?, ?)`,
  );

  const insertDeal = db.prepare(
    `INSERT INTO deals (
       id, merchant_id, title, slug, description, type, coupon_code, destination_url,
       affiliate_url, original_price, sale_price, discount_percent, discount_amount,
       currency, start_date, expires_at, verified, last_verified_at, status, source,
       source_external_id, featured, trending, click_count, worked_yes, worked_no,
       category, terms, is_demo, score, score_updated_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
  );

  const insertClick = db.prepare(
    `INSERT INTO clicks (id, deal_id, merchant_id, src, channel, referrer_host, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
  );

  const insertFeedback = db.prepare(
    "INSERT INTO deal_feedback (id, deal_id, worked, created_at) VALUES (?, ?, ?, ?)",
  );

  const result: SeedResult = { merchants: 0, deals: 0, clicks: 0, feedback: 0 };
  const merchantIds = new Map<string, string>();

  const run = db.transaction(() => {
    for (const merchant of DEMO_MERCHANTS) {
      const id = crypto.randomUUID();
      merchantIds.set(merchant.slug, id);
      insertMerchant.run(
        id,
        merchant.name,
        merchant.slug,
        merchant.websiteUrl,
        merchant.affiliateBaseUrl ?? null,
        merchant.description,
        merchant.category,
        merchant.featured ? 1 : 0,
        merchant.qualityScore ?? 50,
        merchant.network,
        nowIso,
        nowIso,
      );
      result.merchants += 1;
    }

    const usedSlugs = new Set<string>();

    for (const deal of DEMO_DEALS) {
      const merchantId = merchantIds.get(deal.merchantSlug);
      if (!merchantId) continue;

      const id = crypto.randomUUID();
      let slug = slugify(`${deal.merchantSlug} ${deal.title}`);
      if (usedSlugs.has(slug)) {
        let index = 2;
        while (usedSlugs.has(`${slug}-${index}`)) index += 1;
        slug = `${slug}-${index}`;
      }
      usedSlugs.add(slug);

      const createdAt = isoDaysFromNow(-(deal.createdDaysAgo ?? 3));
      const expiresAt =
        deal.expiresInDays === undefined ? null : endOfDayIso(deal.expiresInDays);
      const startDate = deal.startsInDays === undefined ? null : isoDaysFromNow(deal.startsInDays);
      const lastVerifiedAt = deal.verified
        ? isoDaysFromNow(-(deal.verifiedDaysAgo ?? 1))
        : null;

      // An explicit status wins; otherwise a past expiry means EXPIRED.
      const status: DealStatus =
        deal.status ??
        (expiresAt && new Date(expiresAt).getTime() < now.getTime() ? "EXPIRED" : "ACTIVE");

      const discountPercent =
        deal.discountPercent ??
        (deal.originalPrice && deal.salePrice && deal.originalPrice > deal.salePrice
          ? Math.round(((deal.originalPrice - deal.salePrice) / deal.originalPrice) * 10000) / 100
          : null);

      const clickCount = deal.clickCount ?? 0;
      const workedYes = deal.workedYes ?? 0;
      const workedNo = deal.workedNo ?? 0;

      const { score } = scoreDeal({
        deal: {
          discountPercent,
          discountAmount: deal.discountAmount ?? null,
          originalPrice: deal.originalPrice ?? null,
          salePrice: deal.salePrice ?? null,
          verified: Boolean(deal.verified),
          lastVerifiedAt,
          createdAt,
          expiresAt,
          clickCount,
          workedYes,
          workedNo,
          trending: Boolean(deal.trending),
          featured: Boolean(deal.featured),
          couponCode: deal.couponCode ?? null,
          description: deal.description,
        },
        merchant: {
          qualityScore: DEMO_MERCHANTS.find((m) => m.slug === deal.merchantSlug)?.qualityScore ?? 50,
          featured: Boolean(DEMO_MERCHANTS.find((m) => m.slug === deal.merchantSlug)?.featured),
        },
        maxClickCount: 420,
        now,
      });

      insertDeal.run(
        id,
        merchantId,
        deal.title,
        slug,
        deal.description,
        deal.type,
        deal.couponCode ?? null,
        deal.destinationUrl,
        deal.originalPrice ?? null,
        deal.salePrice ?? null,
        discountPercent,
        deal.discountAmount ?? null,
        startDate,
        expiresAt,
        deal.verified ? 1 : 0,
        lastVerifiedAt,
        status,
        deal.source,
        deal.externalId ?? null,
        deal.featured ? 1 : 0,
        deal.trending ? 1 : 0,
        clickCount,
        workedYes,
        workedNo,
        deal.category ?? null,
        deal.terms ?? null,
        score,
        nowIso,
        createdAt,
        nowIso,
      );
      result.deals += 1;

      // Click rows are generated so the stored counters and the analytics tables
      // agree with each other.
      const channelTotal = DEMO_CLICK_CHANNELS.reduce((sum, channel) => sum + channel.weight, 0);
      let remaining = clickCount;
      DEMO_CLICK_CHANNELS.forEach((channel, channelIndex) => {
        const isLast = channelIndex === DEMO_CLICK_CHANNELS.length - 1;
        const share = isLast
          ? remaining
          : Math.min(remaining, Math.round((clickCount * channel.weight) / channelTotal));
        remaining -= share;

        for (let i = 0; i < share; i += 1) {
          // Spread clicks across the two weeks up to now, weighted to recent days.
          const ageDays = Math.floor(Math.pow(i / Math.max(share, 1), 2) * 14);
          const createdClickAt = new Date(
            now.getTime() - ageDays * 86_400_000 - (i % 24) * 3_600_000,
          ).toISOString();

          insertClick.run(
            crypto.randomUUID(),
            id,
            merchantId,
            channel.src,
            classifyChannel(channel.src, null, false),
            createdClickAt,
          );
          result.clicks += 1;
        }
      });

      for (let i = 0; i < workedYes; i += 1) {
        insertFeedback.run(crypto.randomUUID(), id, 1, isoDaysFromNow(-(i % 10)));
        result.feedback += 1;
      }
      for (let i = 0; i < workedNo; i += 1) {
        insertFeedback.run(crypto.randomUUID(), id, 0, isoDaysFromNow(-(i % 12)));
        result.feedback += 1;
      }
    }

    db.prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES ('demo_seeded_at', ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(nowIso, nowIso);
  });

  run();
  return result;
}

/** Removes every demo record. Used by `npm run db:reset -- --demo-only`. */
export function clearDemoData(db: Database): { deals: number; merchants: number } {
  const deals = db.prepare("DELETE FROM deals WHERE is_demo = 1").run().changes;
  const merchants = db.prepare("DELETE FROM merchants WHERE is_demo = 1").run().changes;
  return { deals, merchants };
}
