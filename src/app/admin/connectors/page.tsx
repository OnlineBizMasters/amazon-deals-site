import Link from "next/link";
import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import { AdminPanel } from "@/components/admin/StatCard";
import { connectorSummaries } from "@/lib/connectors/registry";
import { requireAdmin } from "@/lib/auth/session";
import { secondaryButtonClass } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connectors", robots: { index: false, follow: false } };

const STATE_LABELS = {
  ready: { label: "Ready", tone: "savings" as const },
  unconfigured: { label: "Not configured", tone: "neutral" as const },
  not_implemented: { label: "Client not built", tone: "urgent" as const },
};

export default async function AdminConnectorsPage() {
  await requireAdmin("/admin/connectors");

  const summaries = connectorSummaries();
  const ready = summaries.filter((entry) => entry.status.state === "ready");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Offer connectors</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every source flows through the same pipeline: a connector produces normalised offers, which
          are then validated, duplicate-checked and committed exactly like a CSV upload. Adding a source
          means registering one connector — nothing else changes.
        </p>
      </header>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-bold text-emerald-900">
          {ready.length} connector(s) working right now: {ready.map((entry) => entry.connector.label).join(", ")}
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          The affiliate network connectors below are declared with the credentials they genuinely
          require. They contain no invented endpoints and make no requests: attempting to run one throws
          a clear error rather than returning fabricated offers. The engine runs fully on manual entry
          and CSV/feed imports in the meantime.
        </p>
        <Link href="/admin/imports" className={`${secondaryButtonClass} mt-3`}>
          Go to CSV import
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {summaries.map(({ connector, status }) => {
          const state = STATE_LABELS[status.state];
          return (
            <AdminPanel
              key={connector.id}
              title={connector.label}
              description={connector.description}
              action={<Badge tone={state.tone}>{state.label}</Badge>}
            >
              <p className="text-sm text-slate-700">{status.message}</p>

              {connector.credentials.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Credentials needed
                  </p>
                  <ul className="mt-2 space-y-2">
                    {connector.credentials.map((credential) => {
                      const missing = status.missingEnv.includes(credential.env);
                      return (
                        <li key={credential.env} className="text-sm">
                          <code
                            className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                              missing ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {credential.env}
                          </code>
                          {!credential.required && (
                            <span className="ml-1 text-xs text-slate-500">(optional)</span>
                          )}
                          <p className="mt-0.5 text-xs text-slate-600">{credential.description}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  What is still required
                </p>
                <p className="mt-1 text-sm text-slate-600">{connector.integrationNotes}</p>
                {connector.docsUrl && (
                  <a
                    href={connector.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Official documentation →
                  </a>
                )}
              </div>

              <p className="mt-3 text-[11px] text-slate-500">
                Source key: <code className="font-mono">{connector.source}</code>
              </p>
            </AdminPanel>
          );
        })}
      </div>

      <AdminPanel title="Adding a new source">
        <ol className="space-y-2 text-sm text-slate-700">
          <li>
            <strong className="font-semibold">1.</strong> Add the key to{" "}
            <code className="font-mono text-xs">OFFER_SOURCES</code> in{" "}
            <code className="font-mono text-xs">src/lib/domain/types.ts</code>.
          </li>
          <li>
            <strong className="font-semibold">2.</strong> Implement{" "}
            <code className="font-mono text-xs">OfferConnector</code> so{" "}
            <code className="font-mono text-xs">fetchOffers()</code> returns{" "}
            <code className="font-mono text-xs">NormalizedOffer[]</code>, reading credentials from the
            environment only.
          </li>
          <li>
            <strong className="font-semibold">3.</strong> Register it in{" "}
            <code className="font-mono text-xs">src/lib/connectors/registry.ts</code>.
          </li>
          <li>
            <strong className="font-semibold">4.</strong> Feed its output through{" "}
            <code className="font-mono text-xs">planImportFromRows</code> and{" "}
            <code className="font-mono text-xs">commitImport</code> to inherit validation, duplicate
            detection, expiry handling and scoring for free.
          </li>
        </ol>
      </AdminPanel>
    </div>
  );
}
