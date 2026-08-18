"use client";

import { useEffect, useState } from "react";

/**
 * "Did this code work?" prompt.
 *
 * The vote is stored as a quality signal for ranking and admin review. It never
 * marks a deal verified on its own. A local flag stops the same browser voting
 * repeatedly without needing to identify the visitor server-side.
 */

type State = "idle" | "sending" | "done" | "error";

export default function DealFeedback({ dealId, compact = false }: { dealId: string; compact?: boolean }) {
  const [state, setState] = useState<State>("idle");
  const [voted, setVoted] = useState<boolean | null>(null);

  const storageKey = `ds_feedback_${dealId}`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "yes" || stored === "no") {
        setVoted(stored === "yes");
        setState("done");
      }
    } catch {
      // Private browsing modes can block storage; voting still works.
    }
  }, [storageKey]);

  const submit = async (worked: boolean) => {
    setState("sending");
    try {
      const response = await fetch(`/api/deals/${dealId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worked }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      setVoted(worked);
      setState("done");
      try {
        window.localStorage.setItem(storageKey, worked ? "yes" : "no");
      } catch {
        // Ignore storage failures.
      }
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className={`text-xs font-medium text-slate-600 ${compact ? "" : "sm:text-sm"}`}>
        {voted
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
        disabled={state === "sending"}
        className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => submit(false)}
        disabled={state === "sending"}
        className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
      >
        No
      </button>
      {state === "error" && (
        <span className="text-xs text-rose-600">Could not save that — please try again.</span>
      )}
    </div>
  );
}
