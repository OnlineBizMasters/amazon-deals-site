"use client";

import { useActionState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import {
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/form";
import { OFFER_SOURCES } from "@/lib/domain/types";
import { commitImportAction, previewImportAction } from "./actions";
import { initialImportState, PREVIEW_ROW_LIMIT, type ImportState } from "./state";

const ACTION_TONES = {
  CREATE: "savings",
  UPDATE: "brand",
  SKIP_DUPLICATE: "urgent",
  ERROR: "warning",
} as const;

export default function ImportWizard() {
  const [state, previewAction, previewPending] = useActionState<ImportState, FormData>(
    previewImportAction,
    initialImportState,
  );

  if (state.step === "upload") {
    return <UploadStep state={state} action={previewAction} pending={previewPending} />;
  }

  return <ReviewStep initial={state} />;
}

function UploadStep({
  state,
  action,
  pending,
}: {
  state: ImportState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="file" className={labelClass}>
          CSV file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          className={`${inputClass} mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700`}
        />
        <p className={hintClass}>
          Up to 2 MB and 5,000 rows per file. Comma, semicolon, tab and pipe delimiters are detected
          automatically.
        </p>
      </div>

      <div>
        <label htmlFor="pasted" className={labelClass}>
          …or paste rows
        </label>
        <textarea
          id="pasted"
          name="pasted"
          rows={5}
          placeholder={"merchant,title,coupon_code,destination_url,discount_percent,expiration_date"}
          className={`${inputClass} mt-1 font-mono text-xs`}
        />
      </div>

      <div className="max-w-xs">
        <label htmlFor="source" className={labelClass}>
          Attribute rows to source
        </label>
        <select id="source" name="source" defaultValue="CSV" className={`${inputClass} mt-1`}>
          {OFFER_SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
        <p className={hintClass}>
          Rows with their own <code>source</code> column override this.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Checking…" : "Preview import"}
        </button>
        <a href="/admin/imports/template" className={secondaryButtonClass} download>
          Download CSV template
        </a>
      </div>
      <p className="text-xs text-slate-500">
        Previewing never writes to the database. You will see exactly what would be created, updated
        or skipped before anything is saved.
      </p>
    </form>
  );
}

function ReviewStep({ initial }: { initial: ImportState }) {
  const [state, commitAction, pending] = useActionState<ImportState, FormData>(
    commitImportAction,
    initial,
  );

  const summary = state.summary;
  const done = state.step === "done";

  return (
    <div className="space-y-5">
      {state.message && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            done
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {state.message}
        </p>
      )}
      {state.error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {state.error}
        </p>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryTile label="Rows" value={summary.total} />
          <SummaryTile label="To create" value={summary.create} tone="savings" />
          <SummaryTile label="To update" value={summary.update} tone="brand" />
          <SummaryTile label="Duplicates" value={summary.skip} tone="urgent" />
          <SummaryTile label="Errors" value={summary.error} tone="warning" />
        </div>
      )}

      {summary && summary.newMerchants > 0 && !done && (
        <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {summary.newMerchants} new merchant record(s) will be created from the merchant column.
        </p>
      )}

      {state.headerCheck && state.headerCheck.unknown.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Ignored column(s): {state.headerCheck.unknown.join(", ")}. Rename them to a supported column
          if the data matters.
        </p>
      )}

      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              {["Row", "Action", "Merchant", "Offer", "Discount", "Notes"].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.rows.map((row) => (
              <tr key={`${row.rowNumber}-${row.lineNumber}`} className="align-top">
                <td className="px-5 py-2 text-slate-500">
                  {row.rowNumber}
                  <span className="block text-[10px] text-slate-400">line {row.lineNumber}</span>
                </td>
                <td className="px-5 py-2">
                  <Badge tone={ACTION_TONES[row.action]}>{row.action.replace("_", " ")}</Badge>
                </td>
                <td className="px-5 py-2 text-slate-700">
                  {row.merchant ?? "—"}
                  {row.newMerchant && (
                    <Badge tone="brand" className="ml-1">
                      new
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-2 text-slate-700">
                  {row.title ?? "—"}
                  {row.couponCode && (
                    <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                      {row.couponCode}
                    </span>
                  )}
                </td>
                <td className="px-5 py-2 text-slate-600">{row.discount ?? "—"}</td>
                <td className="px-5 py-2">
                  {row.duplicateReason && (
                    <p className="text-xs text-amber-800">
                      {row.duplicateReason}
                      {row.duplicateOf && (
                        <>
                          {" — "}
                          <Link
                            href={`/deal/${row.duplicateOf}`}
                            target="_blank"
                            rel="noopener"
                            className="font-semibold underline"
                          >
                            existing offer
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                  {row.errors.map((error) => (
                    <p key={error} className="text-xs font-medium text-rose-700">
                      {error}
                    </p>
                  ))}
                  {row.warnings.map((warning) => (
                    <p key={warning} className="text-xs text-amber-700">
                      {warning}
                    </p>
                  ))}
                  {!row.duplicateReason && row.errors.length === 0 && row.warnings.length === 0 && (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.truncated && (
        <p className="text-xs text-slate-500">
          Showing the first {PREVIEW_ROW_LIMIT} rows. All rows are processed on import and recorded in
          the batch report.
        </p>
      )}

      {done ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          {state.batchId && (
            <Link href={`/admin/imports/${state.batchId}`} className={primaryButtonClass}>
              View import report
            </Link>
          )}
          <Link href="/admin/deals" className={secondaryButtonClass}>
            Go to deals
          </Link>
          <Link href="/admin/imports" className={secondaryButtonClass}>
            Import another file
          </Link>
        </div>
      ) : (
        <form action={commitAction} className="space-y-4 border-t border-slate-200 pt-4">
          <input type="hidden" name="rawText" value={state.rawText ?? ""} />
          <input type="hidden" name="filename" value={state.filename ?? ""} />
          <input type="hidden" name="source" value={state.source} />

          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes for the import history
            </label>
            <input id="notes" name="notes" className={`${inputClass} mt-1 max-w-lg`} />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="dryRun" className="h-4 w-4 accent-brand-600" />
            Dry run — record the batch in history but do not write any offers
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={primaryButtonClass}>
              {pending ? "Importing…" : "Run import"}
            </button>
            <Link href="/admin/imports" className={secondaryButtonClass}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "savings" | "brand" | "urgent" | "warning";
}) {
  const toneClass = {
    neutral: "text-slate-900",
    savings: "text-emerald-700",
    brand: "text-brand-700",
    urgent: "text-amber-700",
    warning: "text-rose-700",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-extrabold ${toneClass}`}>{value.toLocaleString("en-US")}</p>
    </div>
  );
}
