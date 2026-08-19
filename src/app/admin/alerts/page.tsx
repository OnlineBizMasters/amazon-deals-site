import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import { getDb } from "@/lib/db/client";
import { alertDeliveryStatus, listAlerts } from "@/lib/repos/alerts";
import { getMerchantById } from "@/lib/repos/merchants";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Alerts", robots: { index: false, follow: false } };

export default async function AdminAlertsPage() {
  await requireAdmin("/admin/alerts");

  const db = getDb();
  const alerts = listAlerts(200, db);
  const delivery = alertDeliveryStatus();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Deal alerts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Follow rules saved by visitors. The matching logic exists; delivery does not ship in this
          release.
        </p>
      </header>

      <div
        className={`rounded-2xl border p-5 ${
          delivery.configured
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p className="text-sm font-bold text-slate-900">
          Notification delivery: {delivery.configured ? "configured" : "not configured"}
        </p>
        <p className="mt-1 text-sm text-slate-700">{delivery.reason}</p>
        <p className="mt-2 text-xs text-slate-600">
          Required environment variables: <code className="font-mono">EMAIL_PROVIDER</code>,{" "}
          <code className="font-mono">EMAIL_API_KEY</code>,{" "}
          <code className="font-mono">EMAIL_FROM_ADDRESS</code>. A sending transport still has to be
          implemented in <code className="font-mono">src/lib/repos/alerts.ts</code>. Until then nothing
          is sent, and neither this dashboard nor the public form claims otherwise.
        </p>
      </div>

      <AdminPanel title={`${alerts.length} subscription(s)`}>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">No alert subscriptions yet.</p>
        ) : (
          <AdminTable headers={["Email", "Store", "Category", "Min discount", "Status", "Created"]}>
            {alerts.map((alert) => {
              const merchant = alert.merchantId ? getMerchantById(alert.merchantId, db) : null;
              return (
                <tr key={alert.id}>
                  <td className="px-5 py-2 text-slate-800">{alert.email}</td>
                  <td className="px-5 py-2 text-slate-600">{merchant?.name ?? "Any"}</td>
                  <td className="px-5 py-2 text-slate-600">{alert.category ?? "Any"}</td>
                  <td className="px-5 py-2 text-slate-600">
                    {alert.minDiscount ? `${alert.minDiscount}%+` : "Any"}
                  </td>
                  <td className="px-5 py-2">
                    <Badge tone={alert.status === "PENDING_DELIVERY_SETUP" ? "urgent" : "neutral"}>
                      {alert.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-5 py-2 text-slate-600">{formatDateTime(alert.createdAt)}</td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}
