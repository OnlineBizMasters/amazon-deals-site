"use client";

import { useActionState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/form";
import { loginAction } from "./actions";
import { initialLoginState } from "./state";

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialLoginState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="password" className={labelClass}>
          Admin password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={`${inputClass} mt-1`}
        />
      </div>

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
