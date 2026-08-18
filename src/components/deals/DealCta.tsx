"use client";

import { useState } from "react";
import DealFeedback from "./DealFeedback";

/**
 * "Get Code" / "Get Deal" call to action.
 *
 * The button is a real link to the internal `/go/[dealId]` redirect, so the click
 * is recorded server-side and the raw affiliate URL is never rendered in the page.
 * For promo codes the code is revealed in place at the same time, with a copy
 * button, the merchant's stored terms and the "did this code work?" prompt.
 */

interface DealCtaProps {
  dealId: string;
  type: "PROMO_CODE" | "DEAL";
  couponCode: string | null;
  merchantName: string;
  /** Campaign parameter forwarded to the redirect for attribution. */
  src?: string | null;
  terms?: string | null;
  variant?: "card" | "full";
  isDemo?: boolean;
}

export default function DealCta({
  dealId,
  type,
  couponCode,
  merchantName,
  src,
  terms,
  variant = "card",
  isDemo = false,
}: DealCtaProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const trackedHref = src ? `/go/${dealId}?src=${encodeURIComponent(src)}` : `/go/${dealId}`;
  const isCode = type === "PROMO_CODE" && Boolean(couponCode);
  const label = type === "PROMO_CODE" ? "Get Code" : "Get Deal";

  const copyCode = async () => {
    if (!couponCode) return;
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access can be denied; the code stays selectable on screen.
      setCopied(false);
    }
  };

  const buttonClasses =
    variant === "full"
      ? "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
      : "inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700";

  return (
    <div className={variant === "full" ? "w-full" : ""}>
      <a
        href={trackedHref}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        onClick={() => {
          if (isCode) setRevealed(true);
        }}
        className={buttonClasses}
        aria-describedby={revealed ? `code-panel-${dealId}` : undefined}
      >
        {label}
        <span aria-hidden="true">→</span>
      </a>

      {revealed && isCode && (
        <div
          id={`code-panel-${dealId}`}
          className="mt-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            Your {merchantName} code
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="coupon-code flex-1 rounded-lg border-2 border-dashed border-brand-400 bg-white px-3 py-2 text-center text-base font-bold text-slate-900 select-all">
              {couponCode}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-600">
            {merchantName} may apply its own terms, exclusions or minimum spend, and can change or end
            the offer at any time. Check the total at checkout before you buy.
          </p>
          {terms && <p className="mt-1 text-xs text-slate-600">Stored terms: {terms}</p>}
          {isDemo && (
            <p className="mt-1 text-xs font-semibold text-fuchsia-700">
              This is sample data for testing — the code is not a real offer.
            </p>
          )}

          <a
            href={trackedHref}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="mt-2 inline-block text-xs font-semibold text-brand-700 underline underline-offset-2"
          >
            Didn&apos;t the store open? Open {merchantName} again
          </a>

          <div className="mt-3 border-t border-brand-200 pt-3">
            <DealFeedback dealId={dealId} />
          </div>
        </div>
      )}
    </div>
  );
}
