import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import MerchantForm from "../MerchantForm";
import { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import Badge from "@/components/ui/Badge";
import { getDb } from "@/lib/db/client";
import { getMerchantById } from "@/lib/repos/merchants";
import { countDeals, listDeals } from "@/lib/repos/deals";
import { requireAdmin } from "@/lib/auth/session";
import { dangerButtonClass } from "@/components/ui/form";
import { formatDate } from "@/lib/utils/format";
import { deleteMerchantAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit merchant", robots: { index: false, follow: false } };

export default async function EditMerchantPage({ params, searchParams }: PageProps<"/admin/merchants/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/merchants/${id}`);

  const query = await searchParams;
  const db = getDb();
  const merchant = getMerchantById(id, db);
  if (!merchant) notFound();

  const totalDeals = countDeals({ merchantId: merchant.id, status: "ALL" }, db);
  const recentDeals = listDeals({ merchantId: merchant.id, status: "ALL", sort: "newest", limit: 10 }, db);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/admin/merchants" className="hover:text-brand-700">
          Merchants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{merchant.name}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{merchant.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Added {formatDate(merchant.createdAt)} · {totalDeals} offer(s) stored ·{" "}
            <Link href={`/coupons/${merchant.slug}`} target="_blank" rel="noopener" className="text-brand-700 hover:underline">
              View public page →
            </Link>
          </p>
        </div>
      </header>

      {query.created && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Merchant created.
        </p>
      )}
      {query.error === "has-deals" && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          This merchant still has offers attached, so it was not deleted. Delete or reassign its offers
          first, or disable the merchant instead.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <AdminPanel title="Merchant details">
          <MerchantForm merchant={merchant} />
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel
            title="Recent offers"
            description="Newest first, including inactive ones."
            action={
              <Link
                href={`/admin/deals?merchant=${merchant.slug}`}
                className="text-sm font-semibold text-brand-700"
              >
                All →
              </Link>
            }
          >
            {recentDeals.length === 0 ? (
              <p className="text-sm text-slate-500">
                No offers yet.{" "}
                <Link href="/admin/deals/new" className="font-semibold text-brand-700">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <AdminTable headers={["Offer", "Status"]}>
                {recentDeals.map((deal) => (
                  <tr key={deal.id}>
                    <td className="px-5 py-2">
                      <Link
                        href={`/admin/deals/${deal.id}`}
                        className="text-slate-800 hover:text-brand-700"
                      >
                        {deal.title}
                      </Link>
                    </td>
                    <td className="px-5 py-2">
                      <Badge tone={deal.status === "ACTIVE" ? "savings" : "warning"}>
                        {deal.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </AdminPanel>

          <AdminPanel
            title="Delete merchant"
            description="Only possible when no offers are attached. Prefer disabling."
          >
            <form action={deleteMerchantAction}>
              <input type="hidden" name="id" value={merchant.id} />
              <button type="submit" className={dangerButtonClass} disabled={totalDeals > 0}>
                {totalDeals > 0 ? `Cannot delete — ${totalDeals} offer(s) attached` : "Delete merchant"}
              </button>
            </form>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
