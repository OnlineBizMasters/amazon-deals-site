import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DealForm from "../DealForm";
import ContentStudio from "@/components/admin/ContentStudio";
import { AdminPanel } from "@/components/admin/StatCard";
import Badge from "@/components/ui/Badge";
import { getDb } from "@/lib/db/client";
import { getDealById, maxClickCount } from "@/lib/repos/deals";
import { listMerchants } from "@/lib/repos/merchants";
import { scoreDeal } from "@/lib/services/deal-score";
import { scoreVideoPotential } from "@/lib/services/video-score";
import { feedbackSignal, verificationFreshness } from "@/lib/services/verification";
import { generateContent } from "@/lib/content/generate";
import { resolveOutboundUrl } from "@/lib/services/affiliate";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime, relativeTime } from "@/lib/utils/format";
import { dangerButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { deleteDealAction, setDealStatusAction, toggleFlagAction, verifyDealAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit deal", robots: { index: false, follow: false } };

const FRESHNESS_COPY = {
  unverified: "Never verified by an editor.",
  fresh: "Verified within the last 3 days.",
  recent: "Verified within the last 2 weeks.",
  stale: "Verification is more than 2 weeks old — worth re-checking.",
} as const;

export default async function EditDealPage({ params, searchParams }: PageProps<"/admin/deals/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/deals/${id}`);

  const query = await searchParams;
  const db = getDb();
  const deal = getDealById(id, db);
  if (!deal) notFound();

  const merchants = listMerchants({ status: "ALL", sort: "name", limit: 1000 }, db);
  const ceiling = maxClickCount(db);
  const score = scoreDeal({ deal, merchant: deal.merchant, maxClickCount: ceiling });
  const potential = scoreVideoPotential({ deal, merchant: deal.merchant, maxClickCount: ceiling });
  const feedback = feedbackSignal(deal);
  const freshness = verificationFreshness(deal);
  const outbound = resolveOutboundUrl(deal, deal.merchant);
  const content = generateContent(deal, deal.merchant, { maxClickCount: ceiling });

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/admin/deals" className="hover:text-brand-700">
          Deals
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{deal.title}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{deal.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{deal.merchant.name}</span>
            <Badge tone={deal.status === "ACTIVE" ? "savings" : "warning"}>{deal.status}</Badge>
            {deal.verified && <Badge tone="verified">Verified</Badge>}
            {deal.isDemo && <Badge tone="demo">Sample data</Badge>}
            <Link
              href={`/deal/${deal.slug}`}
              target="_blank"
              rel="noopener"
              className="text-brand-700 hover:underline"
            >
              View public page →
            </Link>
          </p>
        </div>
      </header>

      {query.created && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Deal created.
        </p>
      )}
      {query.error === "has-clicks" && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          This deal has recorded clicks, so it was not deleted — removing it would destroy analytics
          history. Set the status to DISABLED instead.
        </p>
      )}

      <div id="content">
        <ContentStudio content={content} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <AdminPanel title="Offer details">
          <DealForm
            deal={deal}
            merchants={merchants.map((merchant) => ({ id: merchant.id, name: merchant.name }))}
          />
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel title="Quick actions">
            <div className="flex flex-wrap gap-2">
              <form action={verifyDealAction}>
                <input type="hidden" name="id" value={deal.id} />
                <input type="hidden" name="verified" value={deal.verified ? "0" : "1"} />
                <button type="submit" className={secondaryButtonClass}>
                  {deal.verified ? "Remove verification" : "Mark verified"}
                </button>
              </form>

              <form action={toggleFlagAction}>
                <input type="hidden" name="id" value={deal.id} />
                <input type="hidden" name="flag" value="featured" />
                <input type="hidden" name="value" value={deal.featured ? "0" : "1"} />
                <button type="submit" className={secondaryButtonClass}>
                  {deal.featured ? "Unfeature" : "Mark featured"}
                </button>
              </form>

              <form action={toggleFlagAction}>
                <input type="hidden" name="id" value={deal.id} />
                <input type="hidden" name="flag" value="trending" />
                <input type="hidden" name="value" value={deal.trending ? "0" : "1"} />
                <button type="submit" className={secondaryButtonClass}>
                  {deal.trending ? "Remove trending" : "Mark trending"}
                </button>
              </form>

              <form action={setDealStatusAction}>
                <input type="hidden" name="id" value={deal.id} />
                <input
                  type="hidden"
                  name="status"
                  value={deal.status === "DISABLED" ? "ACTIVE" : "DISABLED"}
                />
                <button type="submit" className={secondaryButtonClass}>
                  {deal.status === "DISABLED" ? "Re-enable" : "Disable"}
                </button>
              </form>
            </div>

            <form action={deleteDealAction} className="mt-4 border-t border-slate-200 pt-4">
              <input type="hidden" name="id" value={deal.id} />
              <button type="submit" className={dangerButtonClass} disabled={deal.clickCount > 0}>
                {deal.clickCount > 0
                  ? `Cannot delete — ${deal.clickCount} click(s) recorded`
                  : "Delete deal"}
              </button>
              <p className="mt-1 text-xs text-slate-500">
                Deals with recorded clicks are kept so analytics stay intact. Disable them instead.
              </p>
            </form>
          </AdminPanel>

          <AdminPanel title="Deal Score" description={`${score.score}/100`}>
            <ul className="space-y-2">
              {score.breakdown.map((entry) => (
                <li key={entry.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{entry.label}</span>
                    <span className="text-slate-500">
                      {entry.value === null
                        ? "no data"
                        : `${Math.round(entry.value * 100)}% of ${entry.weight}`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={entry.value === null ? "h-full bg-slate-200" : "h-full bg-brand-500"}
                      style={{ width: `${(entry.value ?? 0) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Signals with no stored data are excluded from the calculation rather than assumed.
              Evidence coverage: {Math.round(score.dataCoverage * 100)}%.
            </p>
          </AdminPanel>

          <AdminPanel title="Content potential" description={`${potential.score}/100`}>
            {potential.reasons.length > 0 ? (
              <ul className="space-y-1 text-sm text-slate-700">
                {potential.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span aria-hidden="true" className="text-brand-500">
                      •
                    </span>
                    {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                No strong signals stored for this offer yet.
              </p>
            )}
            <Link
              href="/admin/viral-candidates"
              className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              Compare with other candidates →
            </Link>
          </AdminPanel>

          <AdminPanel title="Signals and provenance">
            <dl className="space-y-3 text-sm">
              <Row label="Verification" value={FRESHNESS_COPY[freshness]} />
              <Row
                label="Last verified"
                value={
                  deal.lastVerifiedAt
                    ? `${relativeTime(deal.lastVerifiedAt)} (${formatDateTime(deal.lastVerifiedAt)})`
                    : "Never"
                }
              />
              <Row
                label="Visitor feedback"
                value={
                  feedback.total === 0
                    ? "No votes yet"
                    : `${deal.workedYes} yes / ${deal.workedNo} no — ${feedback.recommendation.replace(/_/g, " ")}`
                }
              />
              <Row label="Clicks" value={deal.clickCount.toLocaleString("en-US")} />
              <Row label="Source" value={`${deal.source}${deal.sourceExternalId ? ` · ${deal.sourceExternalId}` : ""}`} />
              <Row label="Created" value={formatDateTime(deal.createdAt) ?? "—"} />
              <Row label="Updated" value={formatDateTime(deal.updatedAt) ?? "—"} />
              <Row
                label="Outbound link"
                value={`${outbound.strategy.replace(/_/g, " ")}${outbound.monetized ? " (monetised)" : " (not monetised)"}`}
              />
              <Row label="Tracked path" value={`/go/${deal.id}`} />
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              Verification is manual in this release. Visitor Yes/No votes feed ranking and this panel,
              but never set the verified flag on their own.
            </p>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-800">{value}</dd>
    </div>
  );
}
