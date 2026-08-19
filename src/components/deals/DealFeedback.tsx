"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/**
 * "Did this code work?" prompt.
 *
 * The vote is stored as a quality signal for ranking and admin review. It never
 * marks a deal verified on its own.
 *
 * A previous vote is remembered in local storage so the same browser is not asked
 * twice, without identifying the visitor server-side. Local storage is read through
 * `useSyncExternalStore` because it is exactly that — an external store — which
 * also keeps the server render and hydration consistent.
 */

type SubmitState = "idle" | "sending" | "error";

function subscribeToStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readVote(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private browsing modes can block storage; voting still works.
    return null;
  }
}

export default function DealFeedback({ dealId, compact = false }: { dealId: string; compact?: boolean }) {
  const storageKey = `ds_feedback_${dealId}`;

  const getSnapshot = useCallback(() => readVote(storageKey), [storageKey]);
  const storedVote = useSyncExternalStore(subscribeToStorage, getSnapshot, () => null);

  const [submittedVote, setSubmittedVote] = useState<boolean | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const vote =
    submittedVote ?? (storedVote === "yes" ? true : storedVote === "no" ? false : null);

  const submit = async (worked: boolean) => {
    setSubmitState("sending");
    try {
      const response = await fetch(`/api/deals/${dealId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worked }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      try {
        window.localStorage.setItem(storageKey, worked ? "yes" : "no");
      } catch {
        // Ignore storage failures — the vote was still recorded server-side.
      }
      setSubmittedVote(worked);
      setSubmitState("idle");
    } catch {
      setSubmitState("error");
    }
  };

  if (vote !== null) {
    return (
      <p className={`text-xs font-medium text-slate-600 ${compact ? "" : "sm:text-sm"}`}>
        {vote
          ? "Thanks — recorded as working. This helps rank the deal."
          : "Thanks — recorded as not working. We use this to flag the deal for review."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`font-semibold text-slate-700 ${compact ? "text-xs" : "text-xs sm:text-sm"}`}>
        Did this work?
      </span>
      <button
        type="button"
        onClick={() => submit(true)}
        disabled={submitState === "sending"}
        className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => submit(false)}
        disabled={submitState === "sending"}
        className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
      >
        No
      </button>
      {submitState === "error" && (
        <span className="text-xs text-rose-600">Could not save that — please try again.</span>
      )}
    </div>
  );
}
