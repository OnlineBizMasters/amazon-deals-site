import DealsExplorer from "@/components/DealsExplorer";
import type { CardProduct } from "@/components/ProductCard";
import {
  CATEGORIES,
  discountPercent,
  queryProducts,
} from "@/lib/products";

export default function Home() {
  const products = queryProducts({ sort: "discount" });
  const initialProducts: CardProduct[] = products.map((p) => ({
    ...p,
    discountPercent: discountPercent(p),
  }));

  const dealCount = initialProducts.length;
  const bestDiscount = initialProducts.reduce(
    (max, p) => Math.max(max, p.discountPercent),
    0,
  );
  const avgRating =
    initialProducts.reduce((sum, p) => sum + p.rating, 0) / (dealCount || 1);

  return (
    <main className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-200 ring-1 ring-inset ring-white/20">
            🇺🇸 Updated daily for US shoppers
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Find today&apos;s best{" "}
            <span className="text-orange-400">Amazon deals</span> in seconds.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            DealScout curates real discounts across every category — search,
            filter, and jump straight to the product on Amazon.
          </p>
          <div className="mt-8 flex flex-wrap gap-8">
            <Stat value={`${dealCount}`} label="Live deals" />
            <Stat value={`${bestDiscount}%`} label="Biggest discount" />
            <Stat value={avgRating.toFixed(1)} label="Avg. rating" />
          </div>
          <a
            href="#deals"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-400"
          >
            Browse the deals ↓
          </a>
        </div>
      </section>

      <DealsExplorer initialProducts={initialProducts} categories={[...CATEGORIES]} />

      <section
        id="how-it-works"
        className="border-t border-slate-200 bg-white"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3">
          <HowItWorks
            icon="🔎"
            title="Discover"
            body="Search and filter by category, price, rating, or discount to find exactly what you want."
          />
          <HowItWorks
            icon="🏷️"
            title="Compare"
            body="See list price vs. deal price and the exact percentage you save at a glance."
          />
          <HowItWorks
            icon="🛒"
            title="Buy on Amazon"
            body="Tap through to Amazon with one click — every link is a verified product page."
          />
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-extrabold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function HowItWorks({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <span className="text-3xl">{icon}</span>
      <h3 className="mt-3 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
