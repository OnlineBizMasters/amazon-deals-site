import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import { SITE } from "@/lib/site";

const NAV_LINKS = [
  { href: "/search?sort=best", label: "Top deals" },
  { href: "/search?type=PROMO_CODE", label: "Coupon codes" },
  { href: "/stores", label: "Stores" },
  { href: "/categories", label: "Categories" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex items-center gap-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-sm font-black text-white shadow-sm">
              DS
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Deal<span className="text-brand-600">Scout</span>
            </span>
          </Link>

          <div className="hidden flex-1 lg:block">
            <SearchBar />
          </div>

          <nav aria-label="Main" className="ml-auto hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 transition hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/submit-coupon"
              className="rounded-full bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Submit a coupon
            </Link>
          </nav>
        </div>

        <div className="pb-3 lg:hidden">
          <SearchBar />
        </div>

        <nav
          aria-label="Mobile"
          className="-mx-4 flex gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-slate-600"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/submit-coupon" className="whitespace-nowrap text-sm font-semibold text-brand-700">
            Submit a coupon
          </Link>
        </nav>
      </div>
      <p className="sr-only">{SITE.tagline}</p>
    </header>
  );
}
