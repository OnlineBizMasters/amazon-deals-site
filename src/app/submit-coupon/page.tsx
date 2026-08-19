import Link from "next/link";
import type { Metadata } from "next";
import SubmitCouponForm from "./SubmitCouponForm";
import { getDb } from "@/lib/db/client";
import { listMerchants } from "@/lib/repos/merchants";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit a coupon",
  description: `Share a working coupon code or deal with ${SITE.name}. Every submission is reviewed by an editor before it is published.`,
  alternates: { canonical: "/submit-coupon" },
  robots: { index: true, follow: true },
};

export default function SubmitCouponPage() {
  const merchantNames = listMerchants({ status: "ALL", limit: 1000 }, getDb()).map(
    (merchant) => merchant.name,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Submit a coupon</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
        Submit a coupon
      </h1>
      <p className="mt-2 text-base text-slate-600">
        Found a code that works? Send it over. Submissions are queued as <strong>pending</strong> and
        an editor reviews them before anything appears on the site — nothing you submit is published
        automatically.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <SubmitCouponForm merchantNames={merchantNames} />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">What happens next</p>
        <ol className="mt-2 space-y-1.5">
          <li>1. Your submission is stored with a PENDING status.</li>
          <li>2. An editor checks the store, the code and the destination page.</li>
          <li>
            3. If it checks out, it becomes a live offer credited to the user-submission source. If
            not, it is rejected and stays unpublished.
          </li>
        </ol>
        <p className="mt-3">
          We only ask for details about the offer. Please do not include personal information in the
          description.
        </p>
      </div>
    </main>
  );
}
