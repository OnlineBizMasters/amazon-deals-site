import Link from "next/link";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    heading: "Browse",
    links: [
      { href: "/search?sort=best", label: "Today's top deals" },
      { href: "/search?type=PROMO_CODE", label: "Coupon codes" },
      { href: "/search?sort=discount", label: "Biggest discounts" },
      { href: "/search?ending=1", label: "Ending soon" },
      { href: "/stores", label: "All stores" },
      { href: "/categories", label: "Categories" },
    ],
  },
  {
    heading: "Take part",
    links: [
      { href: "/submit-coupon", label: "Submit a coupon" },
      { href: "/alerts", label: "Deal alerts" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/affiliate-disclosure", label: "Affiliate disclosure" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 text-xs font-black text-white">
                DS
              </span>
              Deal<span className="-ml-1.5 text-brand-600">Scout</span>
            </p>
            <p className="mt-3 text-sm text-slate-600">{SITE.tagline}</p>
            <p className="mt-3 text-sm text-slate-500">
              We list what stores and affiliate networks publish. We never invent discounts,
              countdowns or stock levels.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-sm font-bold uppercase tracking-wide text-slate-900">
                {column.heading}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-600 hover:text-brand-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500">
          <p>
            <strong className="font-semibold text-slate-700">Affiliate disclosure:</strong>{" "}
            {SITE.name} may earn a commission when you buy through links on this site, at no extra
            cost to you. Prices, availability and coupon codes are set by the merchant and can change
            or expire at any time. Merchants decide final pricing and eligibility.{" "}
            <Link href="/affiliate-disclosure" className="font-semibold text-brand-700 hover:underline">
              Read the full disclosure
            </Link>
            .
          </p>
          <p className="mt-3">
            © {new Date().getFullYear()} {SITE.name}. Store names and logos are the property of their
            respective owners, and their appearance here does not imply endorsement.
          </p>
        </div>
      </div>
    </footer>
  );
}
