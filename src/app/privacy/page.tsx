import Link from "next/link";
import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${SITE.name} records when you use the site, and what it deliberately does not record.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Privacy</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Privacy</h1>
      <p className="mt-3 text-base text-slate-600">
        This page describes what this software records by default. If you are running your own
        deployment, review it against the analytics, hosting and email providers you add.
      </p>

      <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
        <h2 className="text-xl font-bold text-slate-900">What we record</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Outbound clicks.</strong> When you use a Get Code or Get Deal button, we store
            which offer and store you clicked, the timestamp, the campaign tag in the link (for
            example <code className="rounded bg-slate-100 px-1">src=youtube</code>) and the hostname of
            the page you came from. Nothing else.
          </li>
          <li>
            <strong>Offer feedback.</strong> If you press Yes or No on &ldquo;did this work?&rdquo;, we
            store the offer, the answer and the time.
          </li>
          <li>
            <strong>Coupon submissions.</strong> If you submit a coupon, we store what you typed into
            the form.
          </li>
          <li>
            <strong>Deal alerts.</strong> If you create an alert, we store your email address and the
            rule you chose.
          </li>
        </ul>

        <h2 className="pt-2 text-xl font-bold text-slate-900">What we do not record</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>No IP addresses are stored with clicks.</li>
          <li>No advertising or cross-site tracking cookies are set by this application.</li>
          <li>No full referrer URLs — only the hostname.</li>
          <li>No accounts, names or payment details. There is nothing to log in to as a visitor.</li>
        </ul>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Cookies and local storage</h2>
        <p>
          The public site sets no tracking cookies. Your browser&apos;s local storage is used to
          remember that you already voted on an offer, so you are not asked twice. Administrators who
          sign in receive one signed session cookie, used only to keep them signed in.
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Merchant sites</h2>
        <p>
          When you follow a link to a store, you are on that store&apos;s site and its privacy policy
          and cookies apply. Affiliate networks generally set their own cookie to attribute a sale.
          See our{" "}
          <Link href="/affiliate-disclosure" className="font-semibold text-brand-700 hover:underline">
            affiliate disclosure
          </Link>
          .
        </p>

        <h2 className="pt-2 text-xl font-bold text-slate-900">Retention and removal</h2>
        <p>
          Click and feedback records are kept so we can rank offers and report on performance. Email
          addresses stored for alerts are kept until you ask us to remove them. To have your alert
          removed, email{" "}
          <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-brand-700 hover:underline">
            {SITE.contactEmail}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
