import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="text-6xl">🛒</span>
      <h1 className="mt-6 text-3xl font-extrabold text-slate-900">
        Deal not found
      </h1>
      <p className="mt-2 text-slate-600">
        The product you&apos;re looking for may have sold out or moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
      >
        Back to deals
      </Link>
    </main>
  );
}
