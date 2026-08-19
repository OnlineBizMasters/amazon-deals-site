"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { commitImport, planImportFromCsv, type ImportPlan } from "@/lib/import/engine";
import { isOfferSource, type OfferSource } from "@/lib/domain/types";
import { discountLabel } from "@/lib/utils/format";
import { DUPLICATE_REASON_LABELS } from "@/lib/import/dedupe";
import { requireAdmin } from "@/lib/auth/session";
import { PREVIEW_ROW_LIMIT, type ImportState, type PreviewRow } from "./state";

const MAX_UPLOAD_BYTES = 2_000_000;

function toPreviewRows(plan: ImportPlan): PreviewRow[] {
  return plan.rows.slice(0, PREVIEW_ROW_LIMIT).map((row) => ({
    rowNumber: row.rowNumber,
    lineNumber: row.lineNumber,
    action: row.action,
    merchant: row.offer?.merchantName ?? row.merchant?.name ?? null,
    newMerchant: Boolean(row.merchant?.willCreate),
    title: row.offer?.title ?? null,
    couponCode: row.offer?.couponCode ?? null,
    discount: row.offer
      ? discountLabel({
          discountPercent: row.offer.discountPercent,
          discountAmount: row.offer.discountAmount,
          originalPrice: row.offer.originalPrice,
          salePrice: row.offer.salePrice,
          currency: row.offer.currency,
        })
      : null,
    expiresAt: row.offer?.expiresAt ?? null,
    duplicateReason: row.duplicate ? DUPLICATE_REASON_LABELS[row.duplicate.reason] : null,
    duplicateOf: row.duplicate?.slug ?? null,
    errors: row.errors.map((issue) => `${issue.field}: ${issue.message}`),
    warnings: row.warnings.map((issue) => `${issue.field}: ${issue.message}`),
  }));
}

async function readUpload(formData: FormData): Promise<{ text: string; filename: string | null; error?: string }> {
  const pasted = String(formData.get("pasted") ?? "").trim();
  const file = formData.get("file");

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        text: "",
        filename: file.name,
        error: `That file is ${(file.size / 1_000_000).toFixed(1)} MB. Please split it into files under 2 MB.`,
      };
    }
    return { text: await file.text(), filename: file.name };
  }

  if (pasted) return { text: pasted, filename: null };

  return { text: "", filename: null, error: "Choose a CSV file or paste some rows first." };
}

/** Step 1: parse, validate and duplicate-check without writing anything. */
export async function previewImportAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireAdmin("/admin/imports");

  const sourceRaw = String(formData.get("source") ?? "CSV");
  const source: OfferSource = isOfferSource(sourceRaw) ? sourceRaw : "CSV";

  const upload = await readUpload(formData);
  if (upload.error) {
    return {
      ...(_previous ?? {}),
      step: "upload",
      message: null,
      error: upload.error,
      rawText: null,
      filename: upload.filename,
      source,
      summary: null,
      headerCheck: null,
      rows: [],
      truncated: false,
      batchId: null,
    };
  }

  const plan = planImportFromCsv(
    upload.text,
    { filename: upload.filename, defaultSource: source },
    getDb(),
  );

  return {
    step: plan.fatalError ? "upload" : "preview",
    message: plan.fatalError
      ? null
      : `Parsed ${plan.summary.total} row(s) using "${plan.delimiter === "\t" ? "tab" : plan.delimiter}" as the delimiter. Nothing has been saved yet.`,
    error: plan.fatalError,
    rawText: upload.text,
    filename: upload.filename,
    source,
    summary: plan.summary,
    headerCheck: plan.headerCheck,
    rows: toPreviewRows(plan),
    truncated: plan.rows.length > PREVIEW_ROW_LIMIT,
    batchId: null,
  };
}

/** Step 2: re-plan the same text and apply it in one transaction. */
export async function commitImportAction(
  previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireAdmin("/admin/imports");

  const rawText = String(formData.get("rawText") ?? previous.rawText ?? "");
  const filename = String(formData.get("filename") ?? "") || previous.filename;
  const sourceRaw = String(formData.get("source") ?? previous.source);
  const source: OfferSource = isOfferSource(sourceRaw) ? sourceRaw : "CSV";
  const dryRun = formData.get("dryRun") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!rawText.trim()) {
    return { ...previous, error: "The uploaded data is no longer available. Please upload it again." };
  }

  const db = getDb();
  const plan = planImportFromCsv(rawText, { filename, defaultSource: source }, db);

  if (plan.fatalError) {
    return { ...previous, step: "upload", error: plan.fatalError };
  }

  const result = commitImport(plan, { dryRun, notes }, db);

  revalidatePath("/admin/imports");
  revalidatePath("/admin/deals");
  revalidatePath("/");
  revalidatePath("/stores");

  return {
    step: "done",
    message: dryRun
      ? `Dry run finished. ${plan.summary.create} row(s) would have been created and ${plan.summary.update} updated. Nothing was saved.`
      : `Import finished: ${result.createdDealIds.length} created, ${result.updatedDealIds.length} updated, ${result.batch.skipped} skipped as duplicates, ${result.batch.failed} failed.`,
    error: null,
    rawText: null,
    filename,
    source,
    summary: plan.summary,
    headerCheck: plan.headerCheck,
    rows: toPreviewRows(plan),
    truncated: plan.rows.length > PREVIEW_ROW_LIMIT,
    batchId: result.batch.id,
  };
}
