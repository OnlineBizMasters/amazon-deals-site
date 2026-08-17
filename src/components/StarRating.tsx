interface StarRatingProps {
  rating: number;
  reviews?: number;
  size?: "sm" | "md";
}

export default function StarRating({ rating, reviews, size = "sm" }: StarRatingProps) {
  const rounded = Math.round(rating * 2) / 2;
  const textSize = size === "md" ? "text-base" : "text-sm";

  return (
    <div className={`flex items-center gap-1.5 ${textSize}`}>
      <span className="flex" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.min(Math.max(rounded - i, 0), 1);
          return (
            <span key={i} className="relative inline-block text-slate-300">
              ★
              <span
                className="absolute inset-0 overflow-hidden text-amber-400"
                style={{ width: `${fill * 100}%` }}
              >
                ★
              </span>
            </span>
          );
        })}
      </span>
      <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
      {typeof reviews === "number" && (
        <span className="text-slate-400">({reviews.toLocaleString("en-US")})</span>
      )}
    </div>
  );
}
