import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-brand-700">404</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 text-slate-600">
        The offer may have expired and been removed from the listings, or the address may be wrong.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          Browse today&apos;s deals
        </Link>
        <Link
          href="/stores"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-400"
        >
          All stores
        </Link>
      </div>
    </main>
  );
}
