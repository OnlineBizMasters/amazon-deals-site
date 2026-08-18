import Link from "next/link";
import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import StatCard, { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import { getDb } from "@/lib/db/client";
import {
  clicksByChannel,
  clicksByMerchant,
  clicksBySrc,
  clicksPerDay,
  clicksSince,
  sourcePerformance,
  totalClicks,
} from "@/lib/repos/clicks";
import { listDeals } from "@/lib/repos/deals";
import { feedbackTotals } from "@/lib/repos/feedback";
import { CHANNEL_LABELS } from "@/lib/services/analytics-channels";
import { requireAdmin } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };

const RANGES = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "all", label: "All time", days: null },
] as const;

export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin("/admin/analytics");

  const params = await searchParams;
  const rangeKey = (Array.isArray(params.range) ? params.range[0] : params.range) ?? "30";
  const range = RANGES.find((candidate) => candidate.key === rangeKey) ?? RANGES[1];
  const sinceIso = range.days ? new Date(Date.now() - range.days * 86_400_000).toISOString() : undefined;

  const db = getDb();
  const channels = clicksByChannel({ sinceIso }, db);
  const srcRows = clicksBySrc({ sinceIso, limit: 25 }, db);
  const daily = clicksPerDay(range.days ?? 60, db);
  const merchants = clicksByMerchant(12, db);
  const sources = sourcePerformance(db);
  const topDeals = listDeals({ status: "ALL", sort: "popular", limit: 12 }, db).filter(
    (deal) => deal.clickCount > 0,
  );
  const feedback = feedbackTotals(db);

  const rangeClicks = sinceIso ? clicksSince(sinceIso, db) : totalClicks(db);
  const channelTotal = channels.reduce((sum, channel) => sum + channel.clicks, 0);
  const peakDay = daily.reduce((max, day) => Math.max(max, day.clicks), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Click data recorded by the <code className="font-mono text-xs">/go</code> redirect. No IP
            addresses, cookies or personal identifiers are stored.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((candidate) => (
            <Link
              key={candidate.key}
              href={`/admin/analytics?range=${candidate.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                candidate.key === range.key
                  ? "bg-brand-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-brand-400"
              }`}
            >
              {candidate.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Clicks (${range.label.toLowerCase()})`} value={rangeClicks} />
        <StatCard label="Clicks all time" value={totalClicks(db)} />
        <StatCard
          label="Worked / didn't"
          value={`${feedback.yes} / ${feedback.no}`}
          hint="Visitor feedback votes"
        />
        <StatCard label="Channels seen" value={channels.length} />
      </div>

      <AdminPanel
        title="Channel comparison"
        description="YouTube, TikTok, Facebook, SEO/direct and everything else, side by side."
      >
        {channels.length === 0 ? (
          <p className="text-sm text-slate-500">No clicks recorded in this period.</p>
        ) : (
          <ul className="space-y-3">
            {channels.map((channel) => {
              const share = channelTotal === 0 ? 0 : (channel.clicks / channelTotal) * 100;
              return (
                <li key={channel.channel}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">
                      {CHANNEL_LABELS[channel.channel] ?? channel.channel}
                    </span>
                    <span className="text-slate-600">
                      {channel.clicks.toLocaleString("en-US")} clicks · {share.toFixed(1)}% ·{" "}
                      {channel.deals} deal(s)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-brand-500" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel
        title="Campaign tags"
        description="Values passed as ?src= on tracked links. Add your own per video or post."
      >
        {srcRows.length === 0 ? (
          <p className="text-sm text-slate-500">No campaign tags recorded yet.</p>
        ) : (
          <AdminTable headers={["src", "Channel", "Clicks"]}>
            {srcRows.map((row) => (
              <tr key={`${row.src ?? "none"}-${row.channel}`}>
                <td className="px-5 py-2 font-mono text-xs text-slate-800">
                  {row.src ?? <span className="text-slate-400">(none)</span>}
                </td>
                <td className="px-5 py-2">
                  <Badge tone="brand">{CHANNEL_LABELS[row.channel] ?? row.channel}</Badge>
                </td>
                <td className="px-5 py-2 font-semibold text-slate-800">
                  {row.clicks.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Example links: <code className="font-mono">{absoluteUrl("/go/DEAL_ID?src=youtube")}</code>,{" "}
          <code className="font-mono">?src=tiktok</code>, <code className="font-mono">?src=facebook</code>.
          Anything unrecognised is grouped as &ldquo;Other&rdquo;; a click with no tag and no external
          referrer counts as SEO / Direct.
        </p>
      </AdminPanel>

      <AdminPanel title="Clicks per day" description={`Daily totals for the ${range.label.toLowerCase()}.`}>
        {daily.length === 0 ? (
          <p className="text-sm text-slate-500">No clicks recorded in this period.</p>
        ) : (
          <div className="flex h-40 items-end gap-1 overflow-x-auto">
            {daily.map((day) => (
              <div key={day.day} className="flex min-w-[18px] flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand-500"
                  style={{ height: `${peakDay === 0 ? 0 : (day.clicks / peakDay) * 100}%` }}
                  title={`${day.day}: ${day.clicks} clicks`}
                />
                <span className="text-[9px] text-slate-400">{day.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Most clicked deals">
          {topDeals.length === 0 ? (
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
          ) : (
            <AdminTable headers={["Deal", "Merchant", "Clicks"]}>
              {topDeals.map((deal) => (
                <tr key={deal.id}>
                  <td className="px-5 py-2">
                    <Link
                      href={`/admin/deals/${deal.id}`}
                      className="text-slate-800 hover:text-brand-700"
                    >
                      {deal.title}
                    </Link>
                  </td>
                  <td className="px-5 py-2 text-slate-600">{deal.merchant.name}</td>
                  <td className="px-5 py-2 font-semibold text-slate-800">
                    {deal.clickCount.toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>

        <AdminPanel title="Merchant clicks">
          {merchants.length === 0 ? (
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
          ) : (
            <AdminTable headers={["Merchant", "Clicks"]}>
              {merchants.map((merchant) => (
                <tr key={merchant.merchantId}>
                  <td className="px-5 py-2 text-slate-800">{merchant.name}</td>
                  <td className="px-5 py-2 font-semibold text-slate-800">
                    {merchant.clicks.toLocaleString("en-US")}
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title="Source performance"
        description="Which offer sources produce catalogue and clicks."
      >
        <AdminTable headers={["Source", "Active", "Total", "Verified", "Clicks", "Clicks per offer"]}>
          {sources.map((source) => (
            <tr key={source.source}>
              <td className="px-5 py-2">
                <Badge tone="brand">{source.source}</Badge>
              </td>
              <td className="px-5 py-2 text-slate-600">{source.activeDeals}</td>
              <td className="px-5 py-2 text-slate-600">{source.deals}</td>
              <td className="px-5 py-2 text-slate-600">{source.verified}</td>
              <td className="px-5 py-2 font-semibold text-slate-800">
                {source.clicks.toLocaleString("en-US")}
              </td>
              <td className="px-5 py-2 text-slate-600">
                {source.deals === 0 ? "—" : (source.clicks / source.deals).toFixed(1)}
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminPanel>
    </div>
  );
}
