import Link from "next/link";
import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import { getDb } from "@/lib/db/client";
import { listMerchants } from "@/lib/repos/merchants";
import { requireAdmin } from "@/lib/auth/session";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { setMerchantStatusAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Merchants", robots: { index: false, follow: false } };

export default async function AdminMerchantsPage({ searchParams }: PageProps<"/admin/merchants">) {
  await requireAdmin("/admin/merchants");

  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) ?? "";

  const merchants = listMerchants({ status: "ALL", q: q || undefined, sort: "deals", limit: 500 }, getDb());

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Merchants</h1>
          <p className="mt-1 text-sm text-slate-600">
            {merchants.length.toLocaleString("en-US")} stored. Disabling a merchant hides it and its
            offers from the public site without deleting anything.
          </p>
        </div>
        <Link href="/admin/merchants/new" className={primaryButtonClass}>
          New merchant
        </Link>
      </header>

      {params.deleted && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Merchant deleted.
        </p>
      )}

      <form action="/admin/merchants" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search merchants…"
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />
        <button type="submit" className={secondaryButtonClass}>
          Search
        </button>
      </form>

      <AdminPanel title="All merchants">
        {merchants.length === 0 ? (
          <p className="text-sm text-slate-500">No merchants match that search.</p>
        ) : (
          <AdminTable
            headers={["Merchant", "Category", "Active offers", "Clicks", "Status", "Actions"]}
          >
            {merchants.map((merchant) => (
              <tr key={merchant.id}>
                <td className="px-5 py-2">
                  <Link
                    href={`/admin/merchants/${merchant.id}`}
                    className="font-medium text-slate-800 hover:text-brand-700"
                  >
                    {merchant.name}
                  </Link>
                  <span className="ml-2 font-mono text-xs text-slate-400">/{merchant.slug}</span>
                  {merchant.featured && (
                    <Badge tone="brand" className="ml-2">
                      Featured
                    </Badge>
                  )}
                  {merchant.isDemo && (
                    <Badge tone="demo" className="ml-2">
                      Sample
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-2 text-slate-600">{merchant.category ?? "—"}</td>
                <td className="px-5 py-2 text-slate-800">
                  {merchant.activeDealCount}
                  {merchant.activeCodeCount > 0 && (
                    <span className="ml-1 text-xs text-slate-500">
                      ({merchant.activeCodeCount} codes)
                    </span>
                  )}
                </td>
                <td className="px-5 py-2 text-slate-600">
                  {merchant.totalClicks.toLocaleString("en-US")}
                </td>
                <td className="px-5 py-2">
                  {merchant.status === "ACTIVE" ? (
                    <Badge tone="savings">Active</Badge>
                  ) : (
                    <Badge tone="warning">Disabled</Badge>
                  )}
                </td>
                <td className="px-5 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/merchants/${merchant.id}`}
                      className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={setMerchantStatusAction}>
                      <input type="hidden" name="id" value={merchant.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={merchant.status === "ACTIVE" ? "DISABLED" : "ACTIVE"}
                      />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-slate-600 hover:underline"
                      >
                        {merchant.status === "ACTIVE" ? "Disable" : "Enable"}
                      </button>
                    </form>
                    <Link
                      href={`/admin/deals?merchant=${merchant.slug}`}
                      className="text-xs font-semibold text-slate-600 hover:underline"
                    >
                      Deals
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </div>
  );
}
