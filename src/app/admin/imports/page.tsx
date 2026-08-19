import Link from "next/link";
import type { Metadata } from "next";
import ImportWizard from "./ImportWizard";
import Badge from "@/components/ui/Badge";
import { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import { getDb } from "@/lib/db/client";
import { listImportBatches } from "@/lib/repos/imports";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils/format";
import { IMPORT_COLUMNS, REQUIRED_COLUMNS } from "@/lib/import/normalize";
import { DUPLICATE_REASON_LABELS } from "@/lib/import/dedupe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Imports", robots: { index: false, follow: false } };

export default async function AdminImportsPage() {
  await requireAdmin("/admin/imports");

  const batches = listImportBatches(25, getDb());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Imports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV or paste delimited rows. Every import is validated and duplicate-checked before
          anything is written, and no external service is involved.
        </p>
      </header>

      <AdminPanel
        title="New import"
        description="Step 1 previews the file. Step 2 applies it in a single transaction."
      >
        <ImportWizard />
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Supported columns">
          <p className="text-sm text-slate-600">
            Required: {REQUIRED_COLUMNS.map((column) => <code key={column} className="mx-0.5 rounded bg-slate-100 px-1 font-mono text-xs">{column}</code>)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {IMPORT_COLUMNS.filter((column) => !REQUIRED_COLUMNS.includes(column)).map((column) => (
              <code
                key={column}
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700"
              >
                {column}
              </code>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Common aliases are mapped automatically — for example <code>store</code>,{" "}
            <code>advertiser</code> and <code>brand</code> all map to <code>merchant</code>, and{" "}
            <code>code</code>, <code>promo_code</code> and <code>voucher_code</code> map to{" "}
            <code>coupon_code</code>. Prices accept <code>$1,299.00</code> and <code>1.299,00</code>{" "}
            formats; dates accept <code>YYYY-MM-DD</code>, <code>MM/DD/YYYY</code> and ISO timestamps.
          </p>
        </AdminPanel>

        <AdminPanel title="How duplicates are detected">
          <ol className="space-y-2 text-sm text-slate-700">
            <li>
              <strong className="font-semibold">1. {DUPLICATE_REASON_LABELS.source_external_id}</strong>{" "}
              — treated as the same feed record and <em>updated</em> in place.
            </li>
            <li>
              <strong className="font-semibold">2. {DUPLICATE_REASON_LABELS.merchant_coupon_code}</strong>{" "}
              — skipped.
            </li>
            <li>
              <strong className="font-semibold">
                3. {DUPLICATE_REASON_LABELS.merchant_destination_url}
              </strong>{" "}
              — skipped (query strings and <code>www.</code> are ignored when comparing).
            </li>
            <li>
              <strong className="font-semibold">4. {DUPLICATE_REASON_LABELS.similar_active_deal}</strong>{" "}
              — skipped when titles overlap by 82% or more on meaningful words.
            </li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            Rows that duplicate each other inside the same file are also caught before the database is
            touched. Give feed rows an <code>external_id</code> so re-imports refresh them instead of
            being skipped.
          </p>
        </AdminPanel>
      </div>

      <AdminPanel title="Import history" description="Most recent 25 batches, including dry runs.">
        {batches.length === 0 ? (
          <p className="text-sm text-slate-500">No imports have been run yet.</p>
        ) : (
          <AdminTable
            headers={["When", "File", "Source", "Rows", "Created", "Updated", "Skipped", "Failed", ""]}
          >
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td className="px-5 py-2 text-slate-600">{formatDateTime(batch.createdAt)}</td>
                <td className="px-5 py-2 text-slate-800">
                  {batch.filename ?? "pasted rows"}
                  {batch.dryRun && (
                    <Badge tone="neutral" className="ml-2">
                      dry run
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-2">
                  <Badge tone="brand">{batch.source}</Badge>
                </td>
                <td className="px-5 py-2 text-slate-600">{batch.totalRows}</td>
                <td className="px-5 py-2 font-semibold text-emerald-700">{batch.created}</td>
                <td className="px-5 py-2 text-brand-700">{batch.updated}</td>
                <td className="px-5 py-2 text-amber-700">{batch.skipped}</td>
                <td className="px-5 py-2 text-rose-700">{batch.failed}</td>
                <td className="px-5 py-2">
                  <Link
                    href={`/admin/imports/${batch.id}`}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Report →
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}
