import { getDb, newId, nowIso, toDbBool, type Db } from "../db/client";
import { mapMerchant, type MerchantRow } from "../db/mappers";
import { slugify, uniqueSlug } from "../utils/slug";
import { normalizeUrl } from "../utils/url";
import type { Merchant, MerchantStatus, OfferSource } from "../domain/types";

export interface MerchantInput {
  name: string;
  slug?: string;
  logo?: string | null;
  websiteUrl?: string | null;
  affiliateBaseUrl?: string | null;
  description?: string | null;
  category?: string | null;
  status?: MerchantStatus;
  featured?: boolean;
  qualityScore?: number;
  network?: OfferSource | null;
  isDemo?: boolean;
}

export interface MerchantQuery {
  q?: string;
  status?: MerchantStatus | "ALL";
  category?: string;
  featured?: boolean;
  /** Only merchants that currently have at least one ACTIVE deal. */
  withActiveDeals?: boolean;
  sort?: "name" | "deals" | "clicks" | "newest";
  limit?: number;
  offset?: number;
}

export interface MerchantWithCounts extends Merchant {
  activeDealCount: number;
  activeCodeCount: number;
  totalClicks: number;
  bestDiscountPercent: number | null;
}

function slugExists(db: Db, slug: string, excludeId?: string): boolean {
  const row = db
    .prepare<unknown[], { id: string }>("SELECT id FROM merchants WHERE slug = ?")
    .get(slug);
  if (!row) return false;
  return row.id !== excludeId;
}

export function createMerchant(input: MerchantInput, db: Db = getDb()): Merchant {
  const now = nowIso();
  const id = newId();
  const slug = uniqueSlug(input.slug || input.name, (candidate) => slugExists(db, candidate));

  db.prepare(
    `INSERT INTO merchants (
       id, name, slug, logo, website_url, affiliate_base_url, description, category,
       status, featured, quality_score, network, is_demo, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name.trim(),
    slug,
    input.logo?.trim() || null,
    normalizeUrl(input.websiteUrl),
    input.affiliateBaseUrl?.trim() || null,
    input.description?.trim() || null,
    input.category?.trim() || null,
    input.status ?? "ACTIVE",
    toDbBool(input.featured),
    Math.min(100, Math.max(0, input.qualityScore ?? 50)),
    input.network ?? null,
    toDbBool(input.isDemo),
    now,
    now,
  );

  return getMerchantById(id, db)!;
}

export function updateMerchant(
  id: string,
  patch: Partial<MerchantInput>,
  db: Db = getDb(),
): Merchant | null {
  const existing = getMerchantById(id, db);
  if (!existing) return null;

  const nextSlug =
    patch.slug !== undefined && slugify(patch.slug) !== existing.slug
      ? uniqueSlug(patch.slug, (candidate) => slugExists(db, candidate, id))
      : existing.slug;

  db.prepare(
    `UPDATE merchants SET
       name = ?, slug = ?, logo = ?, website_url = ?, affiliate_base_url = ?,
       description = ?, category = ?, status = ?, featured = ?, quality_score = ?,
       network = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    (patch.name ?? existing.name).trim(),
    nextSlug,
    patch.logo !== undefined ? patch.logo?.trim() || null : existing.logo,
    patch.websiteUrl !== undefined ? normalizeUrl(patch.websiteUrl) : existing.websiteUrl,
    patch.affiliateBaseUrl !== undefined
      ? patch.affiliateBaseUrl?.trim() || null
      : existing.affiliateBaseUrl,
    patch.description !== undefined ? patch.description?.trim() || null : existing.description,
    patch.category !== undefined ? patch.category?.trim() || null : existing.category,
    patch.status ?? existing.status,
    toDbBool(patch.featured ?? existing.featured),
    Math.min(100, Math.max(0, patch.qualityScore ?? existing.qualityScore)),
    patch.network !== undefined ? patch.network : existing.network,
    nowIso(),
    id,
  );

  return getMerchantById(id, db);
}

export function getMerchantById(id: string, db: Db = getDb()): Merchant | null {
  const row = db
    .prepare<unknown[], MerchantRow>("SELECT * FROM merchants WHERE id = ?")
    .get(id);
  return row ? mapMerchant(row) : null;
}

export function getMerchantBySlug(slug: string, db: Db = getDb()): Merchant | null {
  const row = db
    .prepare<unknown[], MerchantRow>("SELECT * FROM merchants WHERE slug = ?")
    .get(slug);
  return row ? mapMerchant(row) : null;
}

/** Case/whitespace-insensitive lookup used by the import engine. */
export function findMerchantByName(name: string, db: Db = getDb()): Merchant | null {
  const slug = slugify(name);
  if (!slug) return null;

  const bySlug = getMerchantBySlug(slug, db);
  if (bySlug) return bySlug;

  const row = db
    .prepare<unknown[], MerchantRow>(
      "SELECT * FROM merchants WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
    )
    .get(name);
  return row ? mapMerchant(row) : null;
}

/** Finds a merchant by name, creating a minimal record when it is new. */
export function ensureMerchant(
  input: MerchantInput,
  db: Db = getDb(),
): { merchant: Merchant; created: boolean } {
  const existing = findMerchantByName(input.name, db);
  if (existing) return { merchant: existing, created: false };
  return { merchant: createMerchant(input, db), created: true };
}

export function listMerchants(query: MerchantQuery = {}, db: Db = getDb()): MerchantWithCounts[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (query.status && query.status !== "ALL") {
    where.push("m.status = ?");
    params.push(query.status);
  } else if (!query.status) {
    where.push("m.status = 'ACTIVE'");
  }

  if (query.q?.trim()) {
    where.push("(m.name LIKE ? COLLATE NOCASE OR m.slug LIKE ? COLLATE NOCASE)");
    const like = `%${query.q.trim()}%`;
    params.push(like, like);
  }

  if (query.category) {
    where.push("m.category = ?");
    params.push(query.category);
  }

  if (query.featured !== undefined) {
    where.push("m.featured = ?");
    params.push(toDbBool(query.featured));
  }

  const having = query.withActiveDeals ? "HAVING activeDealCount > 0" : "";

  const orderBy = (() => {
    switch (query.sort) {
      case "deals":
        return "activeDealCount DESC, m.name ASC";
      case "clicks":
        return "totalClicks DESC, activeDealCount DESC, m.name ASC";
      case "newest":
        return "m.created_at DESC";
      case "name":
      default:
        return "m.name ASC";
    }
  })();

  const limit = Math.min(Math.max(query.limit ?? 200, 1), 1000);
  const offset = Math.max(query.offset ?? 0, 0);

  type Row = MerchantRow & {
    activeDealCount: number;
    activeCodeCount: number;
    totalClicks: number;
    bestDiscountPercent: number | null;
  };

  const rows = db
    .prepare<unknown[], Row>(
      `SELECT m.*,
              COUNT(CASE WHEN d.status = 'ACTIVE' THEN 1 END)                              AS activeDealCount,
              COUNT(CASE WHEN d.status = 'ACTIVE' AND d.type = 'PROMO_CODE' THEN 1 END)     AS activeCodeCount,
              COALESCE(SUM(d.click_count), 0)                                              AS totalClicks,
              MAX(CASE WHEN d.status = 'ACTIVE' THEN d.discount_percent END)                AS bestDiscountPercent
         FROM merchants m
         LEFT JOIN deals d ON d.merchant_id = m.id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
         GROUP BY m.id
         ${having}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset);

  return rows.map((row) => ({
    ...mapMerchant(row),
    activeDealCount: row.activeDealCount,
    activeCodeCount: row.activeCodeCount,
    totalClicks: row.totalClicks,
    bestDiscountPercent: row.bestDiscountPercent,
  }));
}

export function countMerchants(query: MerchantQuery = {}, db: Db = getDb()): number {
  const row = db
    .prepare<unknown[], { count: number }>(
      `SELECT COUNT(*) AS count FROM merchants ${
        query.status && query.status !== "ALL" ? "WHERE status = ?" : ""
      }`,
    )
    .get(...(query.status && query.status !== "ALL" ? [query.status] : []));
  return row?.count ?? 0;
}

export function getMerchantWithCounts(slug: string, db: Db = getDb()): MerchantWithCounts | null {
  const [merchant] = listMerchants({ q: undefined, status: "ALL", limit: 1000 }, db).filter(
    (candidate) => candidate.slug === slug,
  );
  return merchant ?? null;
}

/** Distinct merchant categories that currently have at least one active deal. */
export function merchantCategories(db: Db = getDb()): { category: string; merchantCount: number }[] {
  return db
    .prepare<unknown[], { category: string; merchantCount: number }>(
      `SELECT m.category AS category, COUNT(DISTINCT m.id) AS merchantCount
         FROM merchants m
         JOIN deals d ON d.merchant_id = m.id AND d.status = 'ACTIVE'
        WHERE m.category IS NOT NULL AND m.status = 'ACTIVE'
        GROUP BY m.category
        ORDER BY merchantCount DESC, m.category ASC`,
    )
    .all();
}

export function deleteMerchant(id: string, db: Db = getDb()): boolean {
  const result = db.prepare("DELETE FROM merchants WHERE id = ?").run(id);
  return result.changes > 0;
}
