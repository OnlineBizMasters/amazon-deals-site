import Link from "next/link";
import type { Metadata } from "next";
import AlertForm from "./AlertForm";
import { getDb } from "@/lib/db/client";
import { alertDeliveryStatus } from "@/lib/repos/alerts";
import { dealCategories } from "@/lib/repos/deals";
import { listMerchants } from "@/lib/repos/merchants";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deal alerts",
  description: `Follow a store, a category or a minimum discount and ${SITE.name} will match new offers against your rule.`,
  alternates: { canonical: "/alerts" },
};

export default async function AlertsPage({ searchParams }: PageProps<"/alerts">) {
  const params = await searchParams;
  const merchantParam = Array.isArray(params.merchant) ? params.merchant[0] : params.merchant;

  const db = getDb();
  const merchants = listMerchants({ withActiveDeals: true, sort: "name", limit: 500 }, db).map(
    (merchant) => ({ slug: merchant.slug, name: merchant.name }),
  );
  const categories = dealCategories(db).map((entry) => entry.category);
  const delivery = alertDeliveryStatus();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Deal alerts</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Deal alerts</h1>
      <p className="mt-2 text-base text-slate-600">
        Follow a store, a category, a minimum discount — or any combination, such as Amazon,
        Electronics, 30% or more.
      </p>

      {!delivery.configured && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">
            Notification delivery is not configured on this deployment
          </p>
          <p className="mt-1 text-sm text-amber-800">{delivery.reason}</p>
          <p className="mt-2 text-sm text-amber-800">
            You can still save a follow rule now — it is stored and will be used once an email
            provider is configured. Nothing will be sent before then, and we will not pretend
            otherwise.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <AlertForm
          merchants={merchants}
          categories={categories}
          defaultMerchant={merchantParam}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">How matching will work</p>
        <p className="mt-2">
          When an offer is imported or added, it is compared against every stored rule: the store must
          match (or the rule must apply to any store), the category must match (or apply to any), and
          the offer&apos;s stored discount must meet your minimum. Offers with no stored discount never
          match a minimum-discount rule.
        </p>
        <p className="mt-3">
          You can ask us to remove your rules at any time — see the{" "}
          <Link href="/privacy" className="font-semibold text-brand-700 hover:underline">
            privacy page
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
