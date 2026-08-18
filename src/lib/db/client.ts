import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { MIGRATIONS } from "./migrations";
import { expireStaleDeals } from "../services/expiration";
import { seedDemoData } from "../seed/seed";

export type Db = Database.Database;

const DEFAULT_DB_PATH = path.join(process.cwd(), ".data", "dealscout.db");

/**
 * Cached across hot reloads so `next dev` does not open a new SQLite handle on
 * every module refresh.
 */
const globalForDb = globalThis as typeof globalThis & {
  __dealscoutDb?: Db;
  __dealscoutLastSweep?: number;
};

function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (!configured) return DEFAULT_DB_PATH;
  if (configured === ":memory:") return configured;
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

function runMigrations(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare<[], { id: string }>("SELECT id FROM _migrations").all().map((row) => row.id),
  );

  const record = db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)");

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.id, new Date().toISOString());
    })();
  }
}

/**
 * Opens (and on first call migrates) the SQLite database. Everything the engine
 * stores lives here, so no external database service is required to run V1.
 */
export function getDb(): Db {
  if (globalForDb.__dealscoutDb) return globalForDb.__dealscoutDb;

  const dbPath = resolveDbPath();
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  runMigrations(db);

  const merchantCount = db.prepare<[], { count: number }>("SELECT COUNT(*) AS count FROM merchants").get();
  if ((merchantCount?.count ?? 0) === 0 && process.env.DEALSCOUT_AUTO_SEED !== "0") {
    seedDemoData(db);
  }

  globalForDb.__dealscoutDb = db;
  return db;
}

/**
 * Creates an isolated in-memory database. Used by tests so they never touch the
 * developer's `.data` directory.
 */
export function createTestDb(options: { seed?: boolean } = {}): Db {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  if (options.seed) seedDemoData(db);
  return db;
}

const SWEEP_INTERVAL_MS = 60_000;

/**
 * Lazily flips ACTIVE deals whose `expires_at` has passed to EXPIRED. Public
 * read paths call this so listings never show a lapsed offer, and it is
 * throttled so a burst of requests performs a single sweep. The same routine is
 * exposed through `POST /api/cron/expire` and `npm run deals:expire` for
 * scheduled execution.
 */
export function sweepExpiredDeals(db: Db = getDb()): number {
  const now = Date.now();
  const last = globalForDb.__dealscoutLastSweep ?? 0;
  if (now - last < SWEEP_INTERVAL_MS) return 0;
  globalForDb.__dealscoutLastSweep = now;
  return expireStaleDeals(db);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDbBool(value: boolean | undefined | null): 0 | 1 {
  return value ? 1 : 0;
}

export function fromDbBool(value: number | null | undefined): boolean {
  return value === 1;
}

export function setMeta(db: Db, key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value, nowIso());
}

export function getMeta(db: Db, key: string): string | null {
  const row = db.prepare<[string], { value: string }>("SELECT value FROM app_meta WHERE key = ?").get(key);
  return row?.value ?? null;
}
