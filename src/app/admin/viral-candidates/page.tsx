import Link from "next/link";
import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { listDeals, maxClickCount } from "@/lib/repos/deals";
import { scoreVideoPotential } from "@/lib/services/video-score";
import { requireAdmin } from "@/lib/auth/session";
import { discountLabel, expiryLabel, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content potential",
  robots: { index: false, follow: false },
};

/**
 * Ranks active offers by how well they would work as short-form content.
 *
 * The wording is deliberately "Content Potential" / "Viral candidate" — this is a
 * ranking of stored signals, not a claim that anything has gone or will go viral.
 */
export default async function ViralCandidatesPage({ searchParams }: PageProps<"/admin/viral-candidates">) {
  await requireAdmin("/admin/viral-candidates");

  const params = await searchParams;
  const minScoreRaw = Array.isArray(params.min) ? params.min[0] : params.min;
  const minScore = Number.parseInt(minScoreRaw ?? "0", 10) || 0;

  const db = getDb();
  sweepExpiredDeals(db);

  const ceiling = maxClickCount(db);
  const candidates = listDeals({ status: "ACTIVE", sort: "best", limit: 300 }, db)
    .map((deal) => ({
      deal,
      potential: scoreVideoPotential({ deal, merchant: deal.merchant, maxClickCount: ceiling }),
    }))
    .filter((entry) => entry.potential.score >= minScore)
    .sort((a, b) => b.potential.score - a.potential.score)
    .slice(0, 60);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Content potential / viral candidates
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Active offers ranked by how usable they are as short-form content: discount strength,
          genuine urgency, freshness, existing engagement and whether enough structured detail is
          stored to write an honest script. This is a ranking of what we hold — not a prediction, and
          not a claim that any offer is &ldquo;viral&rdquo;.
        </p>
      </header>

      <form action="/admin/viral-candidates" className="flex items-end gap-2">
        <label className="text-sm font-semibold text-slate-800">
          Minimum score
          <select
            name="min"
            defaultValue={String(minScore)}
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {[0, 40, 55, 70, 80].map((value) => (
              <option key={value} value={value}>
                {value === 0 ? "Any" : `${value}+`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-400"
        >
          Apply
        </button>
      </form>

      <AdminPanel
        title={`${candidates.length} candidate(s)`}
        description="Open a deal to generate platform templates from its stored data."
      >
        {candidates.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active offers meet that threshold. Add discounts, expiry dates and descriptions to raise
            content potential.
          </p>
        ) : (
          <AdminTable
            headers={[
              "Potential",
              "Offer",
              "Merchant",
              "Discount",
              "Expiry",
              "Verified",
              "Clicks",
              "Deal Score",
              "Source",
              "",
            ]}
          >
            {candidates.map(({ deal, potential }) => (
              <tr key={deal.id} className="align-top">
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-extrabold ${
                      potential.score >= 70
                        ? "bg-emerald-100 text-emerald-800"
                        : potential.score >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {potential.score}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/deals/${deal.id}#content`}
                    className="font-medium text-slate-800 hover:text-brand-700"
                  >
                    {deal.title}
                  </Link>
                  {potential.reasons.length > 0 && (
                    <p className="mt-0.5 text-xs text-slate-500">{potential.reasons[0]}</p>
                  )}
                  {potential.missingData.length > 0 && (
                    <p className="mt-0.5 text-xs text-amber-700">
                      Missing: {potential.missingData.join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-600">{deal.merchant.name}</td>
                <td className="px-5 py-3 text-slate-700">{discountLabel(deal) ?? "—"}</td>
                <td className="px-5 py-3 text-slate-600">
                  {deal.expiresAt ? (
                    <span title={formatDate(deal.expiresAt) ?? undefined}>
                      {expiryLabel(deal.expiresAt)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3">
                  {deal.verified ? (
                    <Badge tone="verified">✓</Badge>
                  ) : (
                    <Badge tone="neutral">No</Badge>
                  )}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {deal.clickCount.toLocaleString("en-US")}
                </td>
                <td className="px-5 py-3 text-slate-600">{deal.score}</td>
                <td className="px-5 py-3">
                  <Badge tone="brand">{deal.source}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/deals/${deal.id}#content`}
                    className="text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Generate →
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>

      <p className="text-xs text-slate-500">
        Reminder for scripts and thumbnails: discount-led titles go stale as soon as the merchant
        changes the price, and an offer that is not marked verified must not be described as verified.
      </p>
    </div>
  );
}
