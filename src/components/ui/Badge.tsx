import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "savings"
  | "urgent"
  | "verified"
  | "code"
  | "warning"
  | "demo";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  savings: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  urgent: "bg-amber-50 text-amber-800 ring-amber-200",
  verified: "bg-emerald-600 text-white ring-emerald-600",
  code: "bg-slate-900 text-white ring-slate-900",
  warning: "bg-rose-50 text-rose-700 ring-rose-200",
  demo: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}

export default function Badge({ children, tone = "neutral", className = "", title }: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
