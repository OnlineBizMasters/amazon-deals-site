import Link from "next/link";
import type { Metadata } from "next";
import MerchantForm from "../MerchantForm";
import { AdminPanel } from "@/components/admin/StatCard";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New merchant", robots: { index: false, follow: false } };

export default async function NewMerchantPage() {
  await requireAdmin("/admin/merchants/new");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link href="/admin/merchants" className="hover:text-brand-700">
          Merchants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">New</span>
      </nav>

      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">New merchant</h1>

      <div className="max-w-3xl">
        <AdminPanel
          title="Merchant details"
          description="Only the name is required. Everything else can be filled in later."
        >
          <MerchantForm />
        </AdminPanel>
      </div>
    </div>
  );
}
