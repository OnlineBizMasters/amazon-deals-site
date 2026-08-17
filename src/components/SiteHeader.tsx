import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-lg shadow-sm">
            🛍️
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Deal<span className="text-orange-600">Scout</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          <Link href="/#deals" className="hidden hover:text-orange-700 sm:inline">
            Today&apos;s Deals
          </Link>
          <Link href="/#how-it-works" className="hidden hover:text-orange-700 sm:inline">
            How it works
          </Link>
          <a
            href="https://www.amazon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-slate-900 px-3.5 py-1.5 text-white transition hover:bg-slate-700"
          >
            Shop on Amazon
          </a>
        </nav>
      </div>
    </header>
  );
}
