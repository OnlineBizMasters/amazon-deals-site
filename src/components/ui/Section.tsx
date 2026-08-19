import Link from "next/link";
import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: string;
  /** Optional "see all" destination. */
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}

export default function Section({
  title,
  description,
  href,
  linkLabel = "View all",
  children,
  id,
  className = "",
}: SectionProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {linkLabel} →
          </Link>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
