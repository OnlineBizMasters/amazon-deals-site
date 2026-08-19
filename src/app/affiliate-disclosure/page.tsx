import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Affiliate disclosure",
  description: `How ${SITE.name} makes money, and what that means for the offers you see.`,
  alternates: { canonical: "/affiliate-disclosure" },
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Affiliate disclosure</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
        Affiliate disclosure
      </h1>

      <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
        <p>
          <strong>{SITE.name} may earn commissions from qualifying purchases.</strong> Many of the
          links on this site are affiliate links. If you click one and buy something, the merchant or
          its affiliate network may pay us a commission. This costs you nothing extra.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">What this does and does not affect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Commission does not change the price you pay. The merchant sets the price, and it is the
            same whether or not you arrive through us.
          </li>
          <li>
            We rank offers with a Deal Score built from the stored discount, verification date,
            freshness, expiry and real click and feedback data. Commission rate is not one of the
            ranking signals.
          </li>
          <li>
            Some offers we list are not monetised at all. We list them when they are useful.
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Prices, availability and codes change</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Prices and availability can change at any time, without notice to us.</li>
          <li>
            Coupon codes can expire, be withdrawn, run out, or apply only to certain products,
            regions or accounts.
          </li>
          <li>
            Merchants control final pricing and eligibility. Their terms always take priority over
            anything written here.
          </li>
          <li>
            Always confirm the price and discount in your basket before completing a purchase.
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-bold text-slate-900">What &ldquo;verified&rdquo; means here</h2>
        <p>
          A &ldquo;Verified&rdquo; label means a person on our team checked the offer on the date shown
          next to it. It is a record of a past check, not a live test and not a guarantee that the
          offer works right now. Offers we have not checked are shown as not verified. We never label
          an offer verified because visitors voted that it worked — that feedback is a separate,
          clearly-labelled signal.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">No manufactured urgency</h2>
        <p>
          We do not invent countdowns, stock levels or purchase counts. If you see an expiry date on
          this site, the merchant or affiliate network supplied it. If no end date was supplied, we
          show no expiry rather than making one up.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Trademarks</h2>
        <p>
          Store names, logos and trademarks belong to their respective owners. Their appearance on
          this site identifies the store an offer relates to and does not imply any endorsement,
          sponsorship or partnership beyond a standard affiliate relationship where one exists.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Sample data</h2>
        <p>
          Development installations of this site are seeded with clearly-labelled sample offers so the
          interface can be tested. Anything marked <strong>Sample data</strong> is not a real offer.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Questions</h2>
        <p>
          Contact us at{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-brand-700 hover:underline">
            {SITE.contactEmail}
          </a>
          . See also our{" "}
          <Link href="/privacy" className="font-semibold text-brand-700 hover:underline">
            privacy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="font-semibold text-brand-700 hover:underline">
            terms
          </Link>{" "}
          pages.
        </p>
      </div>
    </main>
  );
}
