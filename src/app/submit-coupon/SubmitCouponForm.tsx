"use client";

import { useActionState } from "react";
import {
  errorClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form";
import { submitCouponAction } from "./actions";
import { initialSubmitState } from "./state";

export default function SubmitCouponForm({ merchantNames }: { merchantNames: string[] }) {
  const [state, formAction, pending] = useActionState(submitCouponAction, initialSubmitState);

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-lg font-bold text-emerald-900">Submission received</p>
        <p className="mt-2 text-sm text-emerald-800">{state.message}</p>
        <p className="mt-4 text-sm text-emerald-800">
          Every submission starts as <strong>pending</strong>. We check the store, the code and the
          landing page before anything is published.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="merchant" className={labelClass}>
          Store <span className="text-rose-600">*</span>
        </label>
        <input
          id="merchant"
          name="merchant"
          list="known-merchants"
          required
          maxLength={120}
          placeholder="Nike"
          className={`${inputClass} mt-1`}
        />
        <datalist id="known-merchants">
          {merchantNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className={hintClass}>
          If we already list the store, pick the same spelling so your submission is matched to it.
        </p>
        {state.fieldErrors.merchant && <p className={errorClass}>{state.fieldErrors.merchant}</p>}
      </div>

      <div>
        <label htmlFor="couponCode" className={labelClass}>
          Coupon code
        </label>
        <input
          id="couponCode"
          name="couponCode"
          maxLength={40}
          placeholder="SAVE20"
          className={`${inputClass} mt-1 font-mono uppercase`}
        />
        <p className={hintClass}>Leave blank if the offer works without a code.</p>
        {state.fieldErrors.couponCode && <p className={errorClass}>{state.fieldErrors.couponCode}</p>}
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          What does the offer give you? <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          maxLength={600}
          placeholder="20% off full-price running shoes, minimum spend $75."
          className={`${inputClass} mt-1`}
        />
        <p className={hintClass}>
          Include the discount and any conditions you know about. Please do not guess.
        </p>
        {state.fieldErrors.description && (
          <p className={errorClass}>{state.fieldErrors.description}</p>
        )}
      </div>

      <div>
        <label htmlFor="destinationUrl" className={labelClass}>
          Destination URL <span className="text-rose-600">*</span>
        </label>
        <input
          id="destinationUrl"
          name="destinationUrl"
          type="url"
          required
          placeholder="https://www.store.com/sale"
          className={`${inputClass} mt-1`}
        />
        <p className={hintClass}>The page the offer applies to on the store&apos;s own site.</p>
        {state.fieldErrors.destinationUrl && (
          <p className={errorClass}>{state.fieldErrors.destinationUrl}</p>
        )}
      </div>

      <div>
        <label htmlFor="expiresAt" className={labelClass}>
          Expiry date
        </label>
        <input id="expiresAt" name="expiresAt" type="date" className={`${inputClass} mt-1`} />
        <p className={hintClass}>Only if the store states one. Leave blank if you do not know.</p>
        {state.fieldErrors.expiresAt && <p className={errorClass}>{state.fieldErrors.expiresAt}</p>}
      </div>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
