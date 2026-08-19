import Link from "next/link";
import type { Metadata } from "next";
import StatCard, { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import Badge from "@/components/ui/Badge";
import { getDb, getMeta, sweepExpiredDeals } from "@/lib/db/client";
import { adminOverview } from "@/lib/repos/stats";
import { CHANNEL_LABELS } from "@/lib/services/analytics-channels";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, pluralize } from "@/lib/utils/format";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  await requireAdmin("/admin");

  const db = getDb();
  sweepExpiredDeals(db);

  const { metrics, mostClickedDeals, popularMerchants, sources, channels } = adminOverview(db);
  const demoSeededAt = getMeta(db, "demo_seeded_at");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Everything below is read from the database. No external service is required.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/deals/new" className={primaryButtonClass}>
            New deal
          </Link>
          <Link href="/admin/imports" className={secondaryButtonClass}>
            Import CSV
          </Link>
        </div>
      </header>

      {metrics.demoDeals > 0 && (
        <p className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-900">
          <strong className="font-semibold">
            {pluralize(metrics.demoDeals, "sample record")} in the database
          </strong>{" "}
          {demoSeededAt ? `(seeded ${formatDate(demoSeededAt)})` : ""} — labelled as sample data on the
          public site. Remove them with{" "}
          <code className="rounded bg-white px-1 font-mono text-xs">npm run db:seed -- --force</code>{" "}
          once real offers are in place.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Catalogue</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active deals"
            value={metrics.activeDeals}
            hint={`${metrics.activeNonCodeDeals.toLocaleString("en-US")} without a code`}
            href="/admin/deals?status=ACTIVE"
          />
          <StatCard
            label="Active coupons"
            value={metrics.activeCoupons}
            hint="Offers with a promo code"
            href="/admin/deals?status=ACTIVE&type=PROMO_CODE"
          />
          <StatCard
            label="Expired offers"
            value={metrics.expiredOffers}
            hint="Kept for analytics and history"
            href="/admin/deals?status=EXPIRED"
            tone="warning"
          />
          <StatCard
            label="Merchants"
            value={metrics.merchants}
            hint={`${metrics.activeMerchants.toLocaleString("en-US")} active`}
            href="/admin/merchants"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Traffic &amp; quality
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total clicks" value={metrics.totalClicks} href="/admin/analytics" />
          <StatCard
            label="Clicks today"
            value={metrics.clicksToday}
            hint={`${metrics.clicksLast7Days.toLocaleString("en-US")} in the last 7 days`}
            href="/admin/analytics"
          />
          <StatCard
            label="Verified &amp; active"
            value={metrics.verifiedActive}
            hint="Manually checked by an editor"
            tone="positive"
            href="/admin/deals?status=ACTIVE&verified=1"
          />
          <StatCard
            label="Worked / didn't"
            value={`${metrics.feedback.yes} / ${metrics.feedback.no}`}
            hint="Visitor feedback votes"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Queues</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending submissions"
            value={metrics.pendingSubmissions}
            hint="Visitor-submitted, awaiting review"
            href="/admin/submissions"
            tone={metrics.pendingSubmissions > 0 ? "warning" : "neutral"}
          />
          <StatCard
            label="Ending within 3 days"
            value={metrics.endingSoon}
            hint="Consider re-verifying"
            href="/admin/deals?status=ACTIVE&ending=1"
          />
          <StatCard
            label="Pending offers"
            value={metrics.pendingOffers}
            hint="Not published"
            href="/admin/deals?status=PENDING"
          />
          <StatCard
            label="Alert subscriptions"
            value={metrics.alertSubscriptions}
            hint="Delivery needs a provider"
            href="/admin/alerts"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Most clicked deals"
          description="By total recorded clicks."
          action={
            <Link href="/admin/deals?sort=popular" className="text-sm font-semibold text-brand-700">
              All deals →
            </Link>
          }
        >
          {mostClickedDeals.length === 0 ? (
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
          ) : (
            <AdminTable headers={["Deal", "Merchant", "Clicks", "Score"]}>
              {mostClickedDeals.map((deal) => (
                <tr key={deal.id}>
                  <td className="px-5 py-2">
                    <Link
                      href={`/admin/deals/${deal.id}`}
                      className="font-medium text-slate-800 hover:text-brand-700"
                    >
                      {deal.title}
                    </Link>
                    {deal.status !== "ACTIVE" && (
                      <Badge tone="warning" className="ml-2">
                        {deal.status}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-2 text-slate-600">{deal.merchant.name}</td>
                  <td className="px-5 py-2 font-semibold text-slate-800">
                    {deal.clickCount.toLocaleString("en-US")}
                  </td>
                  <td className="px-5 py-2 text-slate-600">{deal.score}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>

        <AdminPanel title="Most popular merchants" description="By recorded click-throughs.">
          {popularMerchants.length === 0 ? (
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
          ) : (
            <AdminTable headers={["Merchant", "Clicks", ""]}>
              {popularMerchants.map((merchant) => (
                <tr key={merchant.merchantId}>
                  <td className="px-5 py-2 font-medium text-slate-800">{merchant.name}</td>
                  <td className="px-5 py-2 text-slate-600">
                    {merchant.clicks.toLocaleString("en-US")}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Link
                      href={`/coupons/${merchant.slug}`}
                      className="text-xs font-semibold text-brand-700"
                      target="_blank"
                      rel="noopener"
                    >
                      View page →
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>

        <AdminPanel
          title="Source performance"
          description="How each offer source contributes to the catalogue and to clicks."
        >
          {sources.length === 0 ? (
            <p className="text-sm text-slate-500">No offers stored yet.</p>
          ) : (
            <AdminTable headers={["Source", "Active", "Total", "Verified", "Clicks"]}>
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
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>

        <AdminPanel
          title="Traffic channels"
          description="Derived from the src parameter on /go links and the referrer hostname."
          action={
            <Link href="/admin/analytics" className="text-sm font-semibold text-brand-700">
              Full analytics →
            </Link>
          }
        >
          {channels.length === 0 ? (
            <p className="text-sm text-slate-500">No clicks recorded yet.</p>
          ) : (
            <AdminTable headers={["Channel", "Clicks", "Deals"]}>
              {channels.map((channel) => (
                <tr key={channel.channel}>
                  <td className="px-5 py-2 font-medium text-slate-800">
                    {CHANNEL_LABELS[channel.channel] ?? channel.channel}
                  </td>
                  <td className="px-5 py-2 text-slate-600">
                    {channel.clicks.toLocaleString("en-US")}
                  </td>
                  <td className="px-5 py-2 text-slate-600">{channel.deals}</td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
