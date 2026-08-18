import Link from "next/link";
import type { Metadata } from "next";
import DealForm from "../DealForm";
import { AdminPanel } from "@/components/admin/StatCard";
import { getDb } from "@/lib/db/client";
import { listMerchants } from "@/lib/repos/merchants";
import { requireAdmin } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/Section";
import { primaryButtonClass } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New deal", robots: { index: false, follow: false } };

export default async function NewDealPage({ searchParams }: PageProps<"/admin/deals/new">) {
  await requireAdmin("/admin/deals/new");

  const params = await searchParams;
  const merchantParam = Array.isArray(params.merchant) ? params.merchant[0] : params.merchant;

  const db = getDb();
  const merchants = listMerchants({ status: "ALL", sort: "name", limit: 1000 }, db);
  const defaultMerchant = merchants.find((merchant) => merchant.slug === merchantParam);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/admin/deals" className="hover:text-brand-700">
          Deals
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">New</span>
      </nav>

      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">New deal</h1>

      <div className="max-w-4xl">
        {merchants.length === 0 ? (
          <EmptyState
            title="Add a merchant first"
            description="Every offer belongs to a merchant, so create one before adding deals."
          >
            <Link href="/admin/merchants/new" className={primaryButtonClass}>
              Create a merchant
            </Link>
          </EmptyState>
        ) : (
          <AdminPanel
            title="Offer details"
            description="Fill in only what you actually know. Empty fields are omitted from the public page rather than guessed."
          >
            <DealForm
              merchants={merchants.map((merchant) => ({ id: merchant.id, name: merchant.name }))}
              defaultMerchantId={defaultMerchant?.id}
            />
          </AdminPanel>
        )}
      </div>
    </div>
  );
}
