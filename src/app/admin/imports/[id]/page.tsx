import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import { getDb } from "@/lib/db/client";
import { getImportBatch, parseImportReport } from "@/lib/repos/imports";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Import report", robots: { index: false, follow: false } };

const ACTION_TONES = {
  CREATE: "savings",
  UPDATE: "brand",
  SKIP_DUPLICATE: "urgent",
  ERROR: "warning",
} as const;

export default async function ImportBatchPage({ params }: PageProps<"/admin/imports/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/imports/${id}`);

  const batch = getImportBatch(id, getDb());
  if (!batch) notFound();

  const report = parseImportReport(batch);
  const problems = report.filter(
    (row) => row.action !== "CREATE" || row.warnings.length > 0,
  );

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/admin/imports" className="hover:text-brand-700">
          Imports
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{batch.filename ?? "pasted rows"}</span>
      </nav>

      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Import report</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>{formatDateTime(batch.createdAt)}</span>
          <Badge tone="brand">{batch.source}</Badge>
          {batch.dryRun && <Badge tone="neutral">Dry run — nothing was written</Badge>}
        </p>
        {batch.notes && <p className="mt-2 text-sm text-slate-600">Notes: {batch.notes}</p>}
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Rows" value={batch.totalRows} />
        <Tile label="Created" value={batch.created} />
        <Tile label="Updated" value={batch.updated} />
        <Tile label="Skipped" value={batch.skipped} />
        <Tile label="Failed" value={batch.failed} />
      </div>

      <AdminPanel
        title="Rows needing attention"
        description="Created rows without warnings are omitted here. The stored report keeps every row."
      >
        {problems.length === 0 ? (
          <p className="text-sm text-slate-500">
            Every row imported cleanly with no duplicates, errors or warnings.
          </p>
        ) : (
          <AdminTable headers={["Row", "Action", "Merchant", "Offer", "Detail"]}>
            {problems.map((row) => (
              <tr key={`${row.rowNumber}-${row.lineNumber}`} className="align-top">
                <td className="px-5 py-2 text-slate-500">
                  {row.rowNumber}
                  <span className="block text-[10px] text-slate-400">line {row.lineNumber}</span>
                </td>
                <td className="px-5 py-2">
                  <Badge tone={ACTION_TONES[row.action as keyof typeof ACTION_TONES] ?? "neutral"}>
                    {row.action.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-5 py-2 text-slate-700">{row.merchant ?? "—"}</td>
                <td className="px-5 py-2 text-slate-700">
                  {row.title ?? "—"}
                  {row.couponCode && (
                    <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                      {row.couponCode}
                    </span>
                  )}
                </td>
                <td className="px-5 py-2">
                  {row.duplicateReason && (
                    <p className="text-xs text-amber-800">
                      Duplicate: {row.duplicateReason.replace(/_/g, " ")}
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
                  {row.errors?.map((error) => (
                    <p key={error.message} className="text-xs font-medium text-rose-700">
                      {error.field}: {error.message}
                    </p>
                  ))}
                  {row.warnings?.map((warning) => (
                    <p key={warning.message} className="text-xs text-amber-700">
                      {warning.field}: {warning.message}
                    </p>
                  ))}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value.toLocaleString("en-US")}</p>
    </div>
  );
}
