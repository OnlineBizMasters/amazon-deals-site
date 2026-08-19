/**
 * Ordered, append-only migration list.
 *
 * Every migration runs exactly once per database and is recorded in the
 * `_migrations` table. To change the schema, append a new entry — never edit an
 * existing one — so that existing databases upgrade safely.
 */
export interface Migration {
  id: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: "0001_core_schema",
    sql: /* sql */ `
      CREATE TABLE IF NOT EXISTS merchants (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,
        slug                TEXT NOT NULL UNIQUE,
        logo                TEXT,
        website_url         TEXT,
        affiliate_base_url  TEXT,
        description         TEXT,
        category            TEXT,
        status              TEXT NOT NULL DEFAULT 'ACTIVE',
        featured            INTEGER NOT NULL DEFAULT 0,
        quality_score       INTEGER NOT NULL DEFAULT 50,
        network             TEXT,
        is_demo             INTEGER NOT NULL DEFAULT 0,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants (status);
      CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants (category);
      CREATE INDEX IF NOT EXISTS idx_merchants_featured ON merchants (featured);

      CREATE TABLE IF NOT EXISTS deals (
        id                  TEXT PRIMARY KEY,
        merchant_id         TEXT NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
        title               TEXT NOT NULL,
        slug                TEXT NOT NULL UNIQUE,
        description         TEXT,
        type                TEXT NOT NULL DEFAULT 'DEAL',
        coupon_code         TEXT,
        destination_url     TEXT NOT NULL,
        affiliate_url       TEXT,
        original_price      REAL,
        sale_price          REAL,
        discount_percent    REAL,
        discount_amount     REAL,
        currency            TEXT NOT NULL DEFAULT 'USD',
        start_date          TEXT,
        expires_at          TEXT,
        verified            INTEGER NOT NULL DEFAULT 0,
        last_verified_at    TEXT,
        status              TEXT NOT NULL DEFAULT 'ACTIVE',
        source              TEXT NOT NULL DEFAULT 'MANUAL',
        source_external_id  TEXT,
        featured            INTEGER NOT NULL DEFAULT 0,
        trending            INTEGER NOT NULL DEFAULT 0,
        click_count         INTEGER NOT NULL DEFAULT 0,
        worked_yes          INTEGER NOT NULL DEFAULT 0,
        worked_no           INTEGER NOT NULL DEFAULT 0,
        category            TEXT,
        terms               TEXT,
        is_demo             INTEGER NOT NULL DEFAULT 0,
        -- Denormalised Deal Score so listings can be ranked in SQL. Recomputed by
        -- src/lib/services/deal-score.ts on write and by the expiration sweep.
        score               REAL NOT NULL DEFAULT 0,
        score_updated_at    TEXT,
        created_at          TEXT NOT NULL,
        updated_at          TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_deals_merchant ON deals (merchant_id);
      CREATE INDEX IF NOT EXISTS idx_deals_status ON deals (status);
      CREATE INDEX IF NOT EXISTS idx_deals_status_expires ON deals (status, expires_at);
      CREATE INDEX IF NOT EXISTS idx_deals_type ON deals (type);
      CREATE INDEX IF NOT EXISTS idx_deals_category ON deals (category);
      CREATE INDEX IF NOT EXISTS idx_deals_created ON deals (created_at);
      CREATE INDEX IF NOT EXISTS idx_deals_source ON deals (source);
      CREATE INDEX IF NOT EXISTS idx_deals_score ON deals (score);
      CREATE INDEX IF NOT EXISTS idx_deals_clicks ON deals (click_count);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_source_external
        ON deals (source, source_external_id)
        WHERE source_external_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS clicks (
        id            TEXT PRIMARY KEY,
        deal_id       TEXT NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
        merchant_id   TEXT NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
        src           TEXT,
        channel       TEXT NOT NULL DEFAULT 'other',
        referrer_host TEXT,
        created_at    TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_clicks_deal ON clicks (deal_id);
      CREATE INDEX IF NOT EXISTS idx_clicks_merchant ON clicks (merchant_id);
      CREATE INDEX IF NOT EXISTS idx_clicks_created ON clicks (created_at);
      CREATE INDEX IF NOT EXISTS idx_clicks_channel ON clicks (channel);

      CREATE TABLE IF NOT EXISTS deal_feedback (
        id         TEXT PRIMARY KEY,
        deal_id    TEXT NOT NULL REFERENCES deals (id) ON DELETE CASCADE,
        worked     INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_deal ON deal_feedback (deal_id);

      CREATE TABLE IF NOT EXISTS deal_submissions (
        id              TEXT PRIMARY KEY,
        merchant_name   TEXT NOT NULL,
        merchant_id     TEXT REFERENCES merchants (id) ON DELETE SET NULL,
        coupon_code     TEXT,
        description     TEXT NOT NULL,
        destination_url TEXT NOT NULL,
        expires_at      TEXT,
        status          TEXT NOT NULL DEFAULT 'PENDING',
        reviewer_notes  TEXT,
        created_deal_id TEXT REFERENCES deals (id) ON DELETE SET NULL,
        created_at      TEXT NOT NULL,
        reviewed_at     TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_submissions_status ON deal_submissions (status);

      CREATE TABLE IF NOT EXISTS deal_alerts (
        id               TEXT PRIMARY KEY,
        email            TEXT NOT NULL,
        merchant_id      TEXT REFERENCES merchants (id) ON DELETE CASCADE,
        category         TEXT,
        min_discount     INTEGER,
        status           TEXT NOT NULL DEFAULT 'PENDING_DELIVERY_SETUP',
        created_at       TEXT NOT NULL,
        last_notified_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_email ON deal_alerts (email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique
        ON deal_alerts (email, IFNULL(merchant_id, ''), IFNULL(category, ''), IFNULL(min_discount, -1));

      CREATE TABLE IF NOT EXISTS import_batches (
        id          TEXT PRIMARY KEY,
        filename    TEXT,
        source      TEXT NOT NULL DEFAULT 'CSV',
        created_at  TEXT NOT NULL,
        total_rows  INTEGER NOT NULL DEFAULT 0,
        created     INTEGER NOT NULL DEFAULT 0,
        updated     INTEGER NOT NULL DEFAULT 0,
        skipped     INTEGER NOT NULL DEFAULT 0,
        failed      INTEGER NOT NULL DEFAULT 0,
        dry_run     INTEGER NOT NULL DEFAULT 0,
        notes       TEXT,
        report_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_import_batches_created ON import_batches (created_at);

      CREATE TABLE IF NOT EXISTS app_meta (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
];
