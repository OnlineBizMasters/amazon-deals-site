"use client";

import { useActionState } from "react";
import {
  errorClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form";
import { createAlertAction } from "./actions";
import { initialAlertState } from "./state";

export default function AlertForm({
  merchants,
  categories,
  defaultMerchant,
}: {
  merchants: { slug: string; name: string }[];
  categories: string[];
  defaultMerchant?: string;
}) {
  const [state, formAction, pending] = useActionState(createAlertAction, initialAlertState);

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "success" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-bold text-emerald-900">{state.message}</p>
          {!state.deliveryConfigured && (
            <p className="mt-1 text-sm text-emerald-800">
              Email delivery is not configured on this deployment, so no notification will be sent
              yet. Your rule is stored and will be used once a provider is configured.
            </p>
          )}
        </div>
      )}

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="email" className={labelClass}>
          Email address <span className="text-rose-600">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder="you@example.com"
          className={`${inputClass} mt-1`}
        />
        <p className={hintClass}>
          Stored only to match this follow rule. We do not store any other personal details.
        </p>
        {state.fieldErrors.email && <p className={errorClass}>{state.fieldErrors.email}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="merchant" className={labelClass}>
            Store
          </label>
          <select
            id="merchant"
            name="merchant"
            defaultValue={defaultMerchant ?? ""}
            className={`${inputClass} mt-1`}
          >
            <option value="">Any store</option>
            {merchants.map((merchant) => (
              <option key={merchant.slug} value={merchant.slug}>
                {merchant.name}
              </option>
            ))}
          </select>
          {state.fieldErrors.merchant && <p className={errorClass}>{state.fieldErrors.merchant}</p>}
        </div>

        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select id="category" name="category" className={`${inputClass} mt-1`}>
            <option value="">Any category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="minDiscount" className={labelClass}>
          Minimum discount
        </label>
        <select id="minDiscount" name="minDiscount" className={`${inputClass} mt-1`}>
          <option value="">Any discount</option>
          {[10, 20, 30, 40, 50, 60, 70].map((value) => (
            <option key={value} value={value}>
              {value}% or more
            </option>
          ))}
        </select>
        <p className={hintClass}>
          Only matches offers that have a discount percentage stored.
        </p>
        {state.fieldErrors.minDiscount && <p className={errorClass}>{state.fieldErrors.minDiscount}</p>}
      </div>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Saving…" : "Save this alert"}
      </button>
    </form>
  );
}
