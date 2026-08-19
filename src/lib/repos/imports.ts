import { getDb, newId, nowIso, toDbBool, type Db } from "../db/client";
import { mapImportBatch, type ImportBatchRow } from "../db/mappers";
import type { ImportBatch, OfferSource } from "../domain/types";

export interface ImportBatchInput {
  filename?: string | null;
  source: OfferSource;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  notes?: string | null;
  report?: unknown;
}

const MAX_REPORT_ROWS = 2000;

export function recordImportBatch(input: ImportBatchInput, db: Db = getDb()): ImportBatch {
  const id = newId();
  const report = Array.isArray(input.report) ? input.report.slice(0, MAX_REPORT_ROWS) : input.report;

  db.prepare(
    `INSERT INTO import_batches (
       id, filename, source, created_at, total_rows, created, updated, skipped, failed,
       dry_run, notes, report_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.filename ?? null,
    input.source,
    nowIso(),
    input.totalRows,
    input.created,
    input.updated,
    input.skipped,
    input.failed,
    toDbBool(input.dryRun),
    input.notes ?? null,
    report === undefined ? null : JSON.stringify(report),
  );

  return getImportBatch(id, db)!;
}

export function getImportBatch(id: string, db: Db = getDb()): ImportBatch | null {
  const row = db
    .prepare<unknown[], ImportBatchRow>("SELECT * FROM import_batches WHERE id = ?")
    .get(id);
  return row ? mapImportBatch(row) : null;
}

export function listImportBatches(limit = 50, db: Db = getDb()): ImportBatch[] {
  return db
    .prepare<unknown[], ImportBatchRow>(
      "SELECT * FROM import_batches ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit)
    .map(mapImportBatch);
}

export interface ImportReportRow {
  rowNumber: number;
  lineNumber: number;
  action: string;
  merchant: string | null;
  title: string | null;
  couponCode: string | null;
  duplicateReason: string | null;
  duplicateOf: string | null;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export function parseImportReport(batch: ImportBatch): ImportReportRow[] {
  if (!batch.reportJson) return [];
  try {
    const parsed: unknown = JSON.parse(batch.reportJson);
    return Array.isArray(parsed) ? (parsed as ImportReportRow[]) : [];
  } catch {
    return [];
  }
}
