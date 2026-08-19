import { getDb, type Db } from "../db/client";
import { createDeal, recomputeAllDealScores, updateDeal } from "../repos/deals";
import { createMerchant, findMerchantByName } from "../repos/merchants";
import { recordImportBatch } from "../repos/imports";
import { runExpirationSweep } from "../services/expiration";
import { parseCsv } from "./csv";
import { findDuplicate, withinBatchKeys, type DuplicateMatch } from "./dedupe";
import { checkHeaders, validateRow, type NormalizedOffer, type RowIssue } from "./validate";
import type { ImportBatch, OfferSource } from "../domain/types";

/**
 * Reusable import layer.
 *
 * `planImport` is a pure read-only pass: it parses, normalises, validates and
 * duplicate-checks every row and returns a preview. `commitImport` then applies a
 * plan inside a single transaction. The same two steps back CSV uploads today and
 * will back affiliate-network connectors, which produce the same
 * `NormalizedOffer` shape.
 */

export type ImportAction = "CREATE" | "UPDATE" | "SKIP_DUPLICATE" | "ERROR";

export interface PlannedRow {
  rowNumber: number;
  lineNumber: number;
  action: ImportAction;
  offer: NormalizedOffer | null;
  errors: RowIssue[];
  warnings: RowIssue[];
  duplicate: DuplicateMatch | null;
  merchant: {
    name: string;
    existingId: string | null;
    willCreate: boolean;
  } | null;
}

export interface ImportPlan {
  source: OfferSource;
  filename: string | null;
  delimiter: string;
  headers: string[];
  headerCheck: ReturnType<typeof checkHeaders>;
  rows: PlannedRow[];
  summary: {
    total: number;
    create: number;
    update: number;
    skip: number;
    error: number;
    newMerchants: number;
  };
  /** Set when the file itself could not be used at all. */
  fatalError: string | null;
}

export interface PlanOptions {
  filename?: string | null;
  defaultSource?: OfferSource;
  /** Rows beyond this count are ignored, protecting the request from huge files. */
  maxRows?: number;
  now?: Date;
}

export const MAX_IMPORT_ROWS = 5000;

export function planImportFromRows(
  rows: Record<string, string>[],
  headers: string[],
  options: PlanOptions & { delimiter?: string; lineNumbers?: number[] } = {},
  db: Db = getDb(),
): ImportPlan {
  const defaultSource = options.defaultSource ?? "CSV";
  const headerCheck = checkHeaders(headers);
  const planned: PlannedRow[] = [];
  const seenKeys = new Map<string, number>();
  const newMerchantNames = new Set<string>();

  const maxRows = options.maxRows ?? MAX_IMPORT_ROWS;
  const limited = rows.slice(0, maxRows);

  limited.forEach((raw, index) => {
    const lineNumber = options.lineNumbers?.[index] ?? index + 2;
    const validated = validateRow(raw, index + 1, lineNumber, {
      defaultSource,
      now: options.now,
    });

    if (!validated.offer) {
      planned.push({
        rowNumber: validated.rowNumber,
        lineNumber,
        action: "ERROR",
        offer: null,
        errors: validated.errors,
        warnings: validated.warnings,
        duplicate: null,
        merchant: null,
      });
      return;
    }

    const offer = validated.offer;
    const warnings = [...validated.warnings];

    // Duplicate rows inside the same file.
    const keys = withinBatchKeys(offer);
    const clashingKey = keys.find((key) => seenKeys.has(key));
    if (clashingKey) {
      planned.push({
        rowNumber: validated.rowNumber,
        lineNumber,
        action: "SKIP_DUPLICATE",
        offer,
        errors: validated.errors,
        warnings: [
          ...warnings,
          {
            field: "row",
            message: `Duplicates row ${seenKeys.get(clashingKey)} in this file`,
          },
        ],
        duplicate: null,
        merchant: null,
      });
      return;
    }
    keys.forEach((key) => seenKeys.set(key, validated.rowNumber));

    const existingMerchant = findMerchantByName(offer.merchantName, db);
    const willCreateMerchant = !existingMerchant;
    if (willCreateMerchant) newMerchantNames.add(offer.merchantName.toLowerCase());

    const duplicate = findDuplicate(offer, existingMerchant?.id ?? null, db);

    let action: ImportAction = "CREATE";
    if (duplicate) {
      // A feed record we have seen before is refreshed; everything else is a
      // duplicate we refuse to re-create.
      action = duplicate.reason === "source_external_id" ? "UPDATE" : "SKIP_DUPLICATE";
    }

    planned.push({
      rowNumber: validated.rowNumber,
      lineNumber,
      action,
      offer,
      errors: validated.errors,
      warnings,
      duplicate,
      merchant: {
        name: offer.merchantName,
        existingId: existingMerchant?.id ?? null,
        willCreate: willCreateMerchant,
      },
    });
  });

  if (rows.length > maxRows) {
    planned.push({
      rowNumber: maxRows + 1,
      lineNumber: maxRows + 2,
      action: "ERROR",
      offer: null,
      errors: [
        {
          field: "file",
          message: `File contains ${rows.length} rows; only the first ${maxRows} were processed. Split the file and import again.`,
        },
      ],
      warnings: [],
      duplicate: null,
      merchant: null,
    });
  }

  return {
    source: defaultSource,
    filename: options.filename ?? null,
    delimiter: options.delimiter ?? ",",
    headers,
    headerCheck,
    rows: planned,
    summary: {
      total: planned.length,
      create: planned.filter((row) => row.action === "CREATE").length,
      update: planned.filter((row) => row.action === "UPDATE").length,
      skip: planned.filter((row) => row.action === "SKIP_DUPLICATE").length,
      error: planned.filter((row) => row.action === "ERROR").length,
      newMerchants: newMerchantNames.size,
    },
    fatalError: null,
  };
}

export function planImportFromCsv(
  text: string,
  options: PlanOptions = {},
  db: Db = getDb(),
): ImportPlan {
  const emptyPlan = (message: string): ImportPlan => ({
    source: options.defaultSource ?? "CSV",
    filename: options.filename ?? null,
    delimiter: ",",
    headers: [],
    headerCheck: { missingRequired: [], unknown: [], recognised: [] },
    rows: [],
    summary: { total: 0, create: 0, update: 0, skip: 0, error: 0, newMerchants: 0 },
    fatalError: message,
  });

  if (!text.trim()) return emptyPlan("The uploaded file is empty.");

  const parsed = parseCsv(text);
  if (parsed.headers.length === 0) {
    return emptyPlan("No header row could be read from the file.");
  }
  if (parsed.rows.length === 0) {
    return emptyPlan("The file has a header row but no data rows.");
  }

  const plan = planImportFromRows(
    parsed.rows,
    parsed.headers,
    { ...options, delimiter: parsed.delimiter, lineNumbers: parsed.lineNumbers },
    db,
  );

  const headerCheck = checkHeaders(parsed.headers);
  if (headerCheck.missingRequired.length > 0) {
    return {
      ...plan,
      fatalError: `Missing required column(s): ${headerCheck.missingRequired.join(", ")}.`,
    };
  }

  return plan;
}

export interface CommitOptions {
  /** When true, nothing is written; the batch is still recorded for history. */
  dryRun?: boolean;
  notes?: string | null;
  /** Deals imported from a file are not demo data unless explicitly flagged. */
  markAsDemo?: boolean;
}

export interface CommitResult {
  batch: ImportBatch;
  createdDealIds: string[];
  updatedDealIds: string[];
}

/**
 * Applies a plan. Merchants referenced by name are created on demand with a
 * minimal record so an import never fails because a store is unknown.
 */
export function commitImport(
  plan: ImportPlan,
  options: CommitOptions = {},
  db: Db = getDb(),
): CommitResult {
  const createdDealIds: string[] = [];
  const updatedDealIds: string[] = [];
  let skipped = plan.rows.filter((row) => row.action === "SKIP_DUPLICATE").length;
  let failed = plan.rows.filter((row) => row.action === "ERROR").length;

  if (!options.dryRun && !plan.fatalError) {
    const apply = db.transaction(() => {
      for (const row of plan.rows) {
        if (!row.offer || row.action === "ERROR" || row.action === "SKIP_DUPLICATE") continue;

        try {
          const offer = row.offer;
          const merchant =
            findMerchantByName(offer.merchantName, db) ??
            createMerchant(
              {
                name: offer.merchantName,
                websiteUrl: offer.merchantWebsite,
                category: offer.category,
                network: offer.source,
              },
              db,
            );

          const expired = offer.expiresAt ? new Date(offer.expiresAt) < new Date() : false;

          if (row.action === "UPDATE" && row.duplicate) {
            updateDeal(
              row.duplicate.dealId,
              {
                title: offer.title,
                description: offer.description,
                type: offer.type,
                couponCode: offer.couponCode,
                destinationUrl: offer.destinationUrl,
                affiliateUrl: offer.affiliateUrl,
                originalPrice: offer.originalPrice,
                salePrice: offer.salePrice,
                discountPercent: offer.discountPercent,
                discountAmount: offer.discountAmount,
                currency: offer.currency,
                startDate: offer.startDate,
                expiresAt: offer.expiresAt,
                status: expired ? "EXPIRED" : "ACTIVE",
                category: offer.category,
                terms: offer.terms,
              },
              db,
            );
            updatedDealIds.push(row.duplicate.dealId);
            continue;
          }

          const deal = createDeal(
            {
              merchantId: merchant.id,
              title: offer.title,
              description: offer.description,
              type: offer.type,
              couponCode: offer.couponCode,
              destinationUrl: offer.destinationUrl,
              affiliateUrl: offer.affiliateUrl,
              originalPrice: offer.originalPrice,
              salePrice: offer.salePrice,
              discountPercent: offer.discountPercent,
              discountAmount: offer.discountAmount,
              currency: offer.currency,
              startDate: offer.startDate,
              expiresAt: offer.expiresAt,
              status: expired ? "EXPIRED" : "ACTIVE",
              source: offer.source,
              sourceExternalId: offer.externalId,
              category: offer.category,
              terms: offer.terms,
              // Verification is editorial: a feed claiming "verified" only sets
              // the flag, and the timestamp records when we imported it.
              verified: offer.verified,
              isDemo: options.markAsDemo ?? false,
            },
            db,
          );
          createdDealIds.push(deal.id);
        } catch (error) {
          failed += 1;
          row.action = "ERROR";
          row.errors.push({
            field: "row",
            message: error instanceof Error ? error.message : "Unknown error while saving row",
          });
        }
      }
    });

    apply();
    runExpirationSweep(db);
    recomputeAllDealScores(db);
  } else if (plan.fatalError) {
    skipped = 0;
    failed = plan.rows.length;
  }

  const report = plan.rows.map((row) => ({
    rowNumber: row.rowNumber,
    lineNumber: row.lineNumber,
    action: row.action,
    merchant: row.offer?.merchantName ?? row.merchant?.name ?? null,
    title: row.offer?.title ?? null,
    couponCode: row.offer?.couponCode ?? null,
    duplicateReason: row.duplicate?.reason ?? null,
    duplicateOf: row.duplicate?.slug ?? null,
    errors: row.errors,
    warnings: row.warnings,
  }));

  const batch = recordImportBatch(
    {
      filename: plan.filename,
      source: plan.source,
      totalRows: plan.rows.length,
      created: createdDealIds.length,
      updated: updatedDealIds.length,
      skipped,
      failed,
      dryRun: Boolean(options.dryRun),
      notes: options.notes ?? plan.fatalError ?? null,
      report,
    },
    db,
  );

  return { batch, createdDealIds, updatedDealIds };
}

/** Header row + one example line, offered as a download in the admin importer. */
export const CSV_TEMPLATE_HEADERS = [
  "merchant",
  "title",
  "description",
  "coupon_code",
  "deal_type",
  "destination_url",
  "affiliate_url",
  "original_price",
  "sale_price",
  "discount_percent",
  "start_date",
  "expiration_date",
  "source",
  "external_id",
  "category",
  "terms",
];
