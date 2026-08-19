import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms that apply when you use ${SITE.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Terms</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Terms of use</h1>

      <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">What this site is</h2>
        <p>
          {SITE.name} publishes coupon codes and deals collected from merchants, affiliate networks,
          data feeds and visitor submissions. We are not the seller. We do not process orders, take
          payment, ship goods or handle returns.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Offers are the merchant&apos;s</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>{SITE.name} may earn commissions from qualifying purchases</strong> made through
            links on this site.
          </li>
          <li>Prices and availability can change at any time.</li>
          <li>Coupon codes can expire or be withdrawn without notice.</li>
          <li>
            Merchants control final pricing, eligibility, exclusions and whether a code applies to
            your order.
          </li>
          <li>
            We publish the discount, code and end date as supplied to us. We do not guarantee that any
            offer will work for you.
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Accuracy</h2>
        <p>
          We work to keep listings accurate and remove offers once their stored end date passes. Even
          so, listings can be out of date or incomplete. Always check the price and discount at
          checkout before buying. An offer marked verified was checked by a person on the date shown;
          that is a record of a past check, not a live guarantee.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Submissions</h2>
        <p>
          If you submit a coupon, you confirm the information is accurate as far as you know and that
          you are allowed to share it. Submissions are reviewed before publication, and we may edit,
          reject or remove any submission. By submitting, you allow us to publish the offer details on
          this site.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Acceptable use</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Do not submit false, misleading or automated content.</li>
          <li>
            Do not attempt to manipulate rankings, click counts or the &ldquo;did this work?&rdquo;
            feedback.
          </li>
          <li>
            Do not scrape or copy the catalogue in bulk without written permission. A JSON API is
            available for reasonable, attributed use.
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Liability</h2>
        <p>
          The site is provided as-is. To the extent permitted by law, we are not liable for losses
          arising from a purchase you make at a merchant, from an offer that does not work, or from any
          inaccuracy in a listing. Your contract for any purchase is with the merchant.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Contact</h2>
        <p>
          Questions or takedown requests:{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-brand-700 hover:underline">
            {SITE.contactEmail}
          </a>
          . See also our{" "}
          <Link href="/affiliate-disclosure" className="font-semibold text-brand-700 hover:underline">
            affiliate disclosure
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-brand-700 hover:underline">
            privacy page
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
