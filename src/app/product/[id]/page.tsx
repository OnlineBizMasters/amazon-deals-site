import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StarRating from "@/components/StarRating";
import ProductCard, { type CardProduct } from "@/components/ProductCard";
import {
  affiliateUrl,
  discountPercent,
  formatPrice,
  getProductById,
  PRODUCTS,
  relatedProducts,
} from "@/lib/products";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Deal not found — DealScout" };
  return {
    title: `${product.title} — DealScout`,
    description: product.blurb,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/product/[id]">) {
  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const discount = discountPercent(product);
  const savings = product.listPrice - product.price;
  const related: CardProduct[] = relatedProducts(product).map((p) => ({
    ...p,
    discountPercent: discountPercent(p),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-orange-700">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/#deals" className="hover:text-orange-700">
          {product.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div
          className={`relative flex h-72 items-center justify-center rounded-3xl bg-gradient-to-br sm:h-96 ${product.gradient}`}
        >
          <span className="text-[10rem] drop-shadow-lg">{product.emoji}</span>
          {discount > 0 && (
            <span className="absolute left-5 top-5 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-bold text-white shadow">
              Save {discount}%
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wide text-orange-600">
            {product.category}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {product.title}
          </h1>
          <div className="mt-3">
            <StarRating rating={product.rating} reviews={product.reviews} size="md" />
          </div>
          <p className="mt-4 text-slate-600">{product.blurb}</p>

          <div className="mt-6 flex items-end gap-3">
            <span className="text-4xl font-extrabold text-slate-900">
              {formatPrice(product.price)}
            </span>
            {product.listPrice > product.price && (
              <span className="pb-1 text-lg text-slate-400 line-through">
                {formatPrice(product.listPrice)}
              </span>
            )}
          </div>
          {savings > 0 && (
            <p className="mt-1 text-sm font-semibold text-emerald-600">
              You save {formatPrice(savings)} ({discount}% off)
            </p>
          )}
          {product.prime && (
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-bold text-sky-700">✓ Prime</span> — fast free
              shipping available
            </p>
          )}

          <a
            href={affiliateUrl(product.asin)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-8 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-orange-400"
          >
            View deal on Amazon →
          </a>

          <ul className="mt-8 space-y-2">
            {product.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-emerald-500">✔</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            More {product.category} deals
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
