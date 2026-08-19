import { initials } from "@/lib/utils/format";

/**
 * Merchant avatar. Logos are operator-supplied URLs, so a plain `img` is used
 * (they cannot be known at build time) and a monogram is rendered whenever no
 * logo is stored, which keeps every listing visually complete.
 */

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

interface MerchantLogoProps {
  name: string;
  logo?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function MerchantLogo({
  name,
  logo,
  size = "md",
  className = "",
}: MerchantLogoProps) {
  const base = `grid shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white font-bold text-slate-700 ${SIZES[size]} ${className}`;

  if (logo) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element -- merchant logos are runtime data, not build-time assets */}
        <img
          src={logo}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span className={base} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
