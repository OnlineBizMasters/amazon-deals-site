import { getDb, newId, nowIso, toDbBool, type Db } from "../db/client";
import {
  DEAL_WITH_MERCHANT_COLUMNS,
  mapDealWithMerchant,
  type DealWithMerchantRow,
  type ScoredDeal,
} from "../db/mappers";
import { scoreDeal } from "../services/deal-score";
import { slugify, uniqueSlug } from "../utils/slug";
import { normalizeUrl } from "../utils/url";
import type { DealStatus, DealType, OfferSource } from "../domain/types";

export interface DealInput {
  merchantId: string;
  title: string;
  slug?: string;
  description?: string | null;
  type: DealType;
  couponCode?: string | null;
  destinationUrl: string;
  affiliateUrl?: string | null;
  originalPrice?: number | null;
  salePrice?: number | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  currency?: string;
  startDate?: string | null;
  expiresAt?: string | null;
  verified?: boolean;
  lastVerifiedAt?: string | null;
  status?: DealStatus;
  source?: OfferSource;
  sourceExternalId?: string | null;
  featured?: boolean;
  trending?: boolean;
  category?: string | null;
  terms?: string | null;
  isDemo?: boolean;
}

export type DealSort =
  | "best"
  | "newest"
  | "discount"
  | "expiring"
  | "popular"
  | "trending"
  | "recently_verified";

export interface DealQuery {
  q?: string;
  merchantId?: string;
  merchantSlug?: string;
  category?: string;
  type?: DealType;
  /** Defaults to ACTIVE only. Pass "ALL" for admin listings. */
  status?: DealStatus | DealStatus[] | "ALL";
  verifiedOnly?: boolean;
  minDiscount?: number;
  /** Restrict to deals expiring within N days (and not already expired). */
  endingWithinDays?: number;
  featured?: boolean;
  trending?: boolean;
  source?: OfferSource;
  hasCode?: boolean;
  excludeDealId?: string;
  excludeDemo?: boolean;
  sort?: DealSort;
  limit?: number;
  offset?: number;
}

interface WhereClause {
  sql: string;
  params: unknown[];
}

function buildWhere(query: DealQuery): WhereClause {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const status = query.status ?? "ACTIVE";
  if (status !== "ALL") {
    const statuses = Array.isArray(status) ? status : [status];
    if (statuses.length > 0) {
      conditions.push(`d.status IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }
  }

  if (query.merchantId) {
    conditions.push("d.merchant_id = ?");
    params.push(query.merchantId);
  }

  if (query.merchantSlug) {
    conditions.push("m.slug = ?");
    params.push(query.merchantSlug);
  }

  if (query.category) {
    conditions.push("(d.category = ? OR (d.category IS NULL AND m.category = ?))");
    params.push(query.category, query.category);
  }

  if (query.type) {
    conditions.push("d.type = ?");
    params.push(query.type);
  }

  if (query.verifiedOnly) {
    conditions.push("d.verified = 1");
  }

  if (typeof query.minDiscount === "number" && query.minDiscount > 0) {
    // Compare against the stored percentage, falling back to one derived from
    // stored prices. Deals with neither are excluded rather than guessed at.
    conditions.push(
      `COALESCE(
         d.discount_percent,
         CASE
           WHEN d.original_price IS NOT NULL AND d.sale_price IS NOT NULL AND d.original_price > 0
           THEN ((d.original_price - d.sale_price) / d.original_price) * 100
         END
       ) >= ?`,
    );
    params.push(query.minDiscount);
  }

  if (typeof query.endingWithinDays === "number") {
    conditions.push("d.expires_at IS NOT NULL AND d.expires_at >= ? AND d.expires_at <= ?");
    const now = new Date();
    params.push(
      now.toISOString(),
      new Date(now.getTime() + query.endingWithinDays * 86_400_000).toISOString(),
    );
  }

  if (query.featured !== undefined) {
    conditions.push("d.featured = ?");
    params.push(toDbBool(query.featured));
  }

  if (query.trending !== undefined) {
    conditions.push("d.trending = ?");
    params.push(toDbBool(query.trending));
  }

  if (query.source) {
    conditions.push("d.source = ?");
    params.push(query.source);
  }

  if (query.hasCode !== undefined) {
    conditions.push(query.hasCode ? "d.coupon_code IS NOT NULL" : "d.coupon_code IS NULL");
  }

  if (query.excludeDealId) {
    conditions.push("d.id != ?");
    params.push(query.excludeDealId);
  }

  if (query.excludeDemo) {
    conditions.push("d.is_demo = 0");
  }

  if (query.q?.trim()) {
    // Substring matching across the fields a shopper would search: merchant,
    // brand, deal wording and the code itself.
    const like = `%${query.q.trim()}%`;
    conditions.push(
      `(d.title LIKE ? COLLATE NOCASE
        OR d.description LIKE ? COLLATE NOCASE
        OR d.coupon_code LIKE ? COLLATE NOCASE
        OR d.category LIKE ? COLLATE NOCASE
        OR m.name LIKE ? COLLATE NOCASE
        OR m.slug LIKE ? COLLATE NOCASE
        OR m.category LIKE ? COLLATE NOCASE)`,
    );
    params.push(like, like, like, like, like, like, like);
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function orderByClause(sort: DealSort = "best"): string {
  switch (sort) {
    case "newest":
      return "d.created_at DESC, d.score DESC";
    case "discount":
      return `COALESCE(
                d.discount_percent,
                CASE WHEN d.original_price > 0 AND d.sale_price IS NOT NULL
                     THEN ((d.original_price - d.sale_price) / d.original_price) * 100 END,
                0
              ) DESC, d.score DESC`;
    case "expiring":
      return "d.expires_at IS NULL, d.expires_at ASC, d.score DESC";
    case "popular":
      return "d.click_count DESC, d.score DESC";
    case "trending":
      return "d.trending DESC, d.click_count DESC, d.score DESC";
    case "recently_verified":
      return "d.verified DESC, d.last_verified_at IS NULL, d.last_verified_at DESC";
    case "best":
    default:
      return "d.featured DESC, d.score DESC, d.created_at DESC";
  }
}

export function listDeals(query: DealQuery = {}, db: Db = getDb()): ScoredDeal[] {
  const where = buildWhere(query);
  const limit = Math.min(Math.max(query.limit ?? 24, 1), 500);
  const offset = Math.max(query.offset ?? 0, 0);

  const rows = db
    .prepare<unknown[], DealWithMerchantRow>(
      `SELECT ${DEAL_WITH_MERCHANT_COLUMNS}
         FROM deals d
         JOIN merchants m ON m.id = d.merchant_id
         ${where.sql}
         ORDER BY ${orderByClause(query.sort)}
         LIMIT ? OFFSET ?`,
    )
    .all(...where.params, limit, offset);

  return rows.map(mapDealWithMerchant);
}

export function countDeals(query: DealQuery = {}, db: Db = getDb()): number {
  const where = buildWhere(query);
  const row = db
    .prepare<unknown[], { count: number }>(
      `SELECT COUNT(*) AS count
         FROM deals d
         JOIN merchants m ON m.id = d.merchant_id
         ${where.sql}`,
    )
    .get(...where.params);
  return row?.count ?? 0;
}

export function getDealById(id: string, db: Db = getDb()): ScoredDeal | null {
  const row = db
    .prepare<unknown[], DealWithMerchantRow>(
      `SELECT ${DEAL_WITH_MERCHANT_COLUMNS}
         FROM deals d JOIN merchants m ON m.id = d.merchant_id
        WHERE d.id = ?`,
    )
    .get(id);
  return row ? mapDealWithMerchant(row) : null;
}

export function getDealBySlug(slug: string, db: Db = getDb()): ScoredDeal | null {
  const row = db
    .prepare<unknown[], DealWithMerchantRow>(
      `SELECT ${DEAL_WITH_MERCHANT_COLUMNS}
         FROM deals d JOIN merchants m ON m.id = d.merchant_id
        WHERE d.slug = ?`,
    )
    .get(slug);
  return row ? mapDealWithMerchant(row) : null;
}

export function getDealBySourceExternalId(
  source: OfferSource,
  externalId: string,
  db: Db = getDb(),
): ScoredDeal | null {
  const row = db
    .prepare<unknown[], DealWithMerchantRow>(
      `SELECT ${DEAL_WITH_MERCHANT_COLUMNS}
         FROM deals d JOIN merchants m ON m.id = d.merchant_id
        WHERE d.source = ? AND d.source_external_id = ?`,
    )
    .get(source, externalId);
  return row ? mapDealWithMerchant(row) : null;
}

function dealSlugExists(db: Db, slug: string, excludeId?: string): boolean {
  const row = db.prepare<unknown[], { id: string }>("SELECT id FROM deals WHERE slug = ?").get(slug);
  if (!row) return false;
  return row.id !== excludeId;
}

/** Derives the percentage from stored prices when the feed did not supply one. */
function derivedDiscountPercent(input: {
  discountPercent?: number | null;
  originalPrice?: number | null;
  salePrice?: number | null;
}): number | null {
  if (typeof input.discountPercent === "number" && input.discountPercent > 0) {
    return Math.min(Math.round(input.discountPercent * 100) / 100, 100);
  }
  if (
    typeof input.originalPrice === "number" &&
    typeof input.salePrice === "number" &&
    input.originalPrice > 0 &&
    input.originalPrice > input.salePrice
  ) {
    return Math.round(((input.originalPrice - input.salePrice) / input.originalPrice) * 10000) / 100;
  }
  return null;
}

export function createDeal(input: DealInput, db: Db = getDb()): ScoredDeal {
  const now = nowIso();
  const id = newId();
  const merchant = db
    .prepare<unknown[], { name: string; category: string | null }>(
      "SELECT name, category FROM merchants WHERE id = ?",
    )
    .get(input.merchantId);

  if (!merchant) {
    throw new Error(`Cannot create deal: merchant ${input.merchantId} does not exist`);
  }

  const slug = uniqueSlug(input.slug || `${merchant.name} ${input.title}`, (candidate) =>
    dealSlugExists(db, candidate),
  );

  db.prepare(
    `INSERT INTO deals (
       id, merchant_id, title, slug, description, type, coupon_code, destination_url,
       affiliate_url, original_price, sale_price, discount_percent, discount_amount,
       currency, start_date, expires_at, verified, last_verified_at, status, source,
       source_external_id, featured, trending, click_count, worked_yes, worked_no,
       category, terms, is_demo, score, score_updated_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, 0, NULL, ?, ?)`,
  ).run(
    id,
    input.merchantId,
    input.title.trim(),
    slug,
    input.description?.trim() || null,
    input.type,
    input.couponCode?.trim().toUpperCase() || null,
    normalizeUrl(input.destinationUrl) ?? input.destinationUrl.trim(),
    normalizeUrl(input.affiliateUrl),
    input.originalPrice ?? null,
    input.salePrice ?? null,
    derivedDiscountPercent(input),
    input.discountAmount ?? null,
    (input.currency || "USD").toUpperCase(),
    input.startDate ?? null,
    input.expiresAt ?? null,
    toDbBool(input.verified),
    input.lastVerifiedAt ?? (input.verified ? now : null),
    input.status ?? "ACTIVE",
    input.source ?? "MANUAL",
    input.sourceExternalId?.trim() || null,
    toDbBool(input.featured),
    toDbBool(input.trending),
    input.category?.trim() || merchant.category || null,
    input.terms?.trim() || null,
    toDbBool(input.isDemo),
    now,
    now,
  );

  recomputeDealScore(id, db);
  return getDealById(id, db)!;
}

export function updateDeal(
  id: string,
  patch: Partial<DealInput>,
  db: Db = getDb(),
): ScoredDeal | null {
  const existing = getDealById(id, db);
  if (!existing) return null;

  const nextSlug =
    patch.slug !== undefined && slugify(patch.slug) && slugify(patch.slug) !== existing.slug
      ? uniqueSlug(patch.slug, (candidate) => dealSlugExists(db, candidate, id))
      : existing.slug;

  const merged = {
    discountPercent:
      patch.discountPercent !== undefined ? patch.discountPercent : existing.discountPercent,
    originalPrice: patch.originalPrice !== undefined ? patch.originalPrice : existing.originalPrice,
    salePrice: patch.salePrice !== undefined ? patch.salePrice : existing.salePrice,
  };

  const verified = patch.verified !== undefined ? patch.verified : existing.verified;
  const lastVerifiedAt =
    patch.lastVerifiedAt !== undefined
      ? patch.lastVerifiedAt
      : verified && !existing.verified
        ? nowIso()
        : existing.lastVerifiedAt;

  db.prepare(
    `UPDATE deals SET
       title = ?, slug = ?, description = ?, type = ?, coupon_code = ?, destination_url = ?,
       affiliate_url = ?, original_price = ?, sale_price = ?, discount_percent = ?,
       discount_amount = ?, currency = ?, start_date = ?, expires_at = ?, verified = ?,
       last_verified_at = ?, status = ?, source = ?, source_external_id = ?, featured = ?,
       trending = ?, category = ?, terms = ?, merchant_id = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    (patch.title ?? existing.title).trim(),
    nextSlug,
    patch.description !== undefined ? patch.description?.trim() || null : existing.description,
    patch.type ?? existing.type,
    patch.couponCode !== undefined
      ? patch.couponCode?.trim().toUpperCase() || null
      : existing.couponCode,
    patch.destinationUrl !== undefined
      ? (normalizeUrl(patch.destinationUrl) ?? existing.destinationUrl)
      : existing.destinationUrl,
    patch.affiliateUrl !== undefined ? normalizeUrl(patch.affiliateUrl) : existing.affiliateUrl,
    merged.originalPrice,
    merged.salePrice,
    derivedDiscountPercent(merged),
    patch.discountAmount !== undefined ? patch.discountAmount : existing.discountAmount,
    (patch.currency ?? existing.currency).toUpperCase(),
    patch.startDate !== undefined ? patch.startDate : existing.startDate,
    patch.expiresAt !== undefined ? patch.expiresAt : existing.expiresAt,
    toDbBool(verified),
    lastVerifiedAt,
    patch.status ?? existing.status,
    patch.source ?? existing.source,
    patch.sourceExternalId !== undefined
      ? patch.sourceExternalId?.trim() || null
      : existing.sourceExternalId,
    toDbBool(patch.featured ?? existing.featured),
    toDbBool(patch.trending ?? existing.trending),
    patch.category !== undefined ? patch.category?.trim() || null : existing.category,
    patch.terms !== undefined ? patch.terms?.trim() || null : existing.terms,
    patch.merchantId ?? existing.merchantId,
    nowIso(),
    id,
  );

  recomputeDealScore(id, db);
  return getDealById(id, db);
}

export function deleteDeal(id: string, db: Db = getDb()): boolean {
  return db.prepare("DELETE FROM deals WHERE id = ?").run(id).changes > 0;
}

export function setDealStatus(id: string, status: DealStatus, db: Db = getDb()): ScoredDeal | null {
  db.prepare("UPDATE deals SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
  recomputeDealScore(id, db);
  return getDealById(id, db);
}

/** Manual verification: records both the flag and when a human checked it. */
export function markDealVerified(
  id: string,
  verified: boolean,
  db: Db = getDb(),
): ScoredDeal | null {
  const now = nowIso();
  db.prepare("UPDATE deals SET verified = ?, last_verified_at = ?, updated_at = ? WHERE id = ?").run(
    toDbBool(verified),
    verified ? now : null,
    now,
    id,
  );
  recomputeDealScore(id, db);
  return getDealById(id, db);
}

export function toggleDealFlag(
  id: string,
  flag: "featured" | "trending",
  value: boolean,
  db: Db = getDb(),
): ScoredDeal | null {
  db.prepare(`UPDATE deals SET ${flag} = ?, updated_at = ? WHERE id = ?`).run(
    toDbBool(value),
    nowIso(),
    id,
  );
  recomputeDealScore(id, db);
  return getDealById(id, db);
}

export function incrementClickCount(id: string, db: Db = getDb()): void {
  db.prepare("UPDATE deals SET click_count = click_count + 1 WHERE id = ?").run(id);
}

export function recordWorkedFeedback(id: string, worked: boolean, db: Db = getDb()): void {
  db.prepare(
    `UPDATE deals SET ${worked ? "worked_yes = worked_yes + 1" : "worked_no = worked_no + 1"}, updated_at = ?
      WHERE id = ?`,
  ).run(nowIso(), id);
}

export function maxClickCount(db: Db = getDb()): number {
  const row = db
    .prepare<unknown[], { value: number | null }>("SELECT MAX(click_count) AS value FROM deals")
    .get();
  return row?.value ?? 0;
}

/**
 * Recomputes and stores the Deal Score for one deal. The formula itself lives in
 * `services/deal-score.ts`; this only persists the result so lists can rank in SQL.
 */
export function recomputeDealScore(id: string, db: Db = getDb()): number {
  const deal = getDealById(id, db);
  if (!deal) return 0;

  const { score } = scoreDeal({
    deal,
    merchant: deal.merchant,
    maxClickCount: maxClickCount(db),
  });

  db.prepare("UPDATE deals SET score = ?, score_updated_at = ? WHERE id = ?").run(
    score,
    nowIso(),
    id,
  );
  return score;
}

/** Batch recompute — used after imports, seeding and scheduled sweeps. */
export function recomputeAllDealScores(db: Db = getDb()): number {
  const ids = db.prepare<unknown[], { id: string }>("SELECT id FROM deals").all();
  const ceiling = maxClickCount(db);
  const update = db.prepare("UPDATE deals SET score = ?, score_updated_at = ? WHERE id = ?");
  const now = nowIso();

  const run = db.transaction(() => {
    for (const { id } of ids) {
      const deal = getDealById(id, db);
      if (!deal) continue;
      const { score } = scoreDeal({ deal, merchant: deal.merchant, maxClickCount: ceiling });
      update.run(score, now, id);
    }
  });
  run();

  return ids.length;
}

/** Related deals: same merchant first, then same category from other merchants. */
export function relatedDeals(
  deal: { id: string; merchantId: string; category: string | null },
  limit = 6,
  db: Db = getDb(),
): ScoredDeal[] {
  const sameMerchant = listDeals(
    { merchantId: deal.merchantId, excludeDealId: deal.id, limit, sort: "best" },
    db,
  );

  if (sameMerchant.length >= limit || !deal.category) return sameMerchant.slice(0, limit);

  const excludeIds = new Set([deal.id, ...sameMerchant.map((item) => item.id)]);
  const sameCategory = listDeals(
    { category: deal.category, limit: limit * 2, sort: "best" },
    db,
  ).filter((candidate) => !excludeIds.has(candidate.id));

  return [...sameMerchant, ...sameCategory].slice(0, limit);
}

export function dealCategories(
  db: Db = getDb(),
): { category: string; dealCount: number; codeCount: number }[] {
  return db
    .prepare<unknown[], { category: string; dealCount: number; codeCount: number }>(
      // The alias must not be reused in GROUP BY/ORDER BY: both joined tables have
      // a `category` column, so the bare name would be ambiguous in SQLite.
      `SELECT COALESCE(d.category, m.category) AS category,
              COUNT(*) AS dealCount,
              COUNT(CASE WHEN d.type = 'PROMO_CODE' THEN 1 END) AS codeCount
         FROM deals d
         JOIN merchants m ON m.id = d.merchant_id
        WHERE d.status = 'ACTIVE' AND COALESCE(d.category, m.category) IS NOT NULL
        GROUP BY COALESCE(d.category, m.category)
        ORDER BY dealCount DESC, COALESCE(d.category, m.category) ASC`,
    )
    .all();
}

/** The single best current offer for a merchant, by Deal Score. */
export function bestDealForMerchant(merchantId: string, db: Db = getDb()): ScoredDeal | null {
  const [deal] = listDeals({ merchantId, limit: 1, sort: "best" }, db);
  return deal ?? null;
}
