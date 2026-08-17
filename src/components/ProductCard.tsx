import Link from "next/link";
import StarRating from "@/components/StarRating";
import { formatPrice, type Product } from "@/lib/products";

export type CardProduct = Product & { discountPercent: number };

export default function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <div
        className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${product.gradient}`}
      >
        <span className="text-6xl drop-shadow-sm transition group-hover:scale-110">
          {product.emoji}
        </span>
        {product.discountPercent > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white shadow">
            -{product.discountPercent}%
          </span>
        )}
        {product.prime && (
          <span className="absolute right-3 top-3 rounded-md bg-sky-950/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-300">
            Prime
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-orange-600">
          {product.category}
        </span>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-orange-700">
          {product.title}
        </h3>
        <StarRating rating={product.rating} reviews={product.reviews} />
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-lg font-extrabold text-slate-900">
            {formatPrice(product.price)}
          </span>
          {product.listPrice > product.price && (
            <span className="text-sm text-slate-400 line-through">
              {formatPrice(product.listPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
