import type { ImportPlan } from "@/lib/import/engine";

/** Row shape shown in the preview table (a trimmed view of the full plan). */
export interface PreviewRow {
  rowNumber: number;
  lineNumber: number;
  action: ImportPlan["rows"][number]["action"];
  merchant: string | null;
  newMerchant: boolean;
  title: string | null;
  couponCode: string | null;
  discount: string | null;
  expiresAt: string | null;
  duplicateReason: string | null;
  duplicateOf: string | null;
  errors: string[];
  warnings: string[];
}

export interface ImportState {
  step: "upload" | "preview" | "done";
  message: string | null;
  error: string | null;
  /** Raw file contents, carried through the preview so commit re-plans identically. */
  rawText: string | null;
  filename: string | null;
  source: string;
  summary: ImportPlan["summary"] | null;
  headerCheck: ImportPlan["headerCheck"] | null;
  rows: PreviewRow[];
  /** True when the preview list was trimmed for display. */
  truncated: boolean;
  batchId: string | null;
}

export const initialImportState: ImportState = {
  step: "upload",
  message: null,
  error: null,
  rawText: null,
  filename: null,
  source: "CSV",
  summary: null,
  headerCheck: null,
  rows: [],
  truncated: false,
  batchId: null,
};

export const PREVIEW_ROW_LIMIT = 200;
