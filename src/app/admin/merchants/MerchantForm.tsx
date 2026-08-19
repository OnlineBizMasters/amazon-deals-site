"use client";

import { useActionState } from "react";
import {
  errorClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form";
import { DEAL_CATEGORIES, OFFER_SOURCES } from "@/lib/domain/types";
import type { Merchant } from "@/lib/domain/types";
import { createMerchantAction, updateMerchantAction } from "./actions";
import { initialMerchantFormState } from "./state";

export default function MerchantForm({ merchant }: { merchant?: Merchant }) {
  const action = merchant ? updateMerchantAction : createMerchantAction;
  const [state, formAction, pending] = useActionState(action, initialMerchantFormState);

  return (
    <form action={formAction} className="space-y-5">
      {merchant && <input type="hidden" name="id" value={merchant.id} />}

      {state.status !== "idle" && state.message && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name <span className="text-rose-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={merchant?.name}
            className={`${inputClass} mt-1`}
          />
          {state.fieldErrors.name && <p className={errorClass}>{state.fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="slug" className={labelClass}>
            URL slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={merchant?.slug}
            placeholder="auto-generated from the name"
            className={`${inputClass} mt-1 font-mono`}
          />
          <p className={hintClass}>
            Page address: <code>/coupons/{merchant?.slug ?? "your-slug"}</code>
          </p>
        </div>

        <div>
          <label htmlFor="websiteUrl" className={labelClass}>
            Website URL
          </label>
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            defaultValue={merchant?.websiteUrl ?? ""}
            placeholder="https://www.store.com/"
            className={`${inputClass} mt-1`}
          />
          {state.fieldErrors.websiteUrl && <p className={errorClass}>{state.fieldErrors.websiteUrl}</p>}
        </div>

        <div>
          <label htmlFor="logo" className={labelClass}>
            Logo URL
          </label>
          <input
            id="logo"
            name="logo"
            type="url"
            defaultValue={merchant?.logo ?? ""}
            className={`${inputClass} mt-1`}
          />
          <p className={hintClass}>Leave blank to show a monogram instead.</p>
          {state.fieldErrors.logo && <p className={errorClass}>{state.fieldErrors.logo}</p>}
        </div>

        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <input
            id="category"
            name="category"
            list="merchant-categories"
            defaultValue={merchant?.category ?? ""}
            className={`${inputClass} mt-1`}
          />
          <datalist id="merchant-categories">
            {DEAL_CATEGORIES.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <p className={hintClass}>Used as the default category for this merchant&apos;s deals.</p>
        </div>

        <div>
          <label htmlFor="network" className={labelClass}>
            Primary network
          </label>
          <select
            id="network"
            name="network"
            defaultValue={merchant?.network ?? ""}
            className={`${inputClass} mt-1`}
          >
            <option value="">Not set</option>
            {OFFER_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <p className={hintClass}>Informational — it does not enable any connector by itself.</p>
        </div>
      </div>

      <div>
        <label htmlFor="affiliateBaseUrl" className={labelClass}>
          Affiliate deep-link template
        </label>
        <input
          id="affiliateBaseUrl"
          name="affiliateBaseUrl"
          defaultValue={merchant?.affiliateBaseUrl ?? ""}
          placeholder="https://network.example/click?id=123&url={destination}"
          className={`${inputClass} mt-1 font-mono text-xs`}
        />
        <p className={hintClass}>
          Used when a deal has no affiliate URL of its own. <code>{"{destination}"}</code> is replaced
          with the URL-encoded destination; without the placeholder the destination is appended as a{" "}
          <code>url</code> parameter. Never put a secret key in here — it is visible in outbound links.
        </p>
        {state.fieldErrors.affiliateBaseUrl && (
          <p className={errorClass}>{state.fieldErrors.affiliateBaseUrl}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={600}
          defaultValue={merchant?.description ?? ""}
          className={`${inputClass} mt-1`}
        />
        <p className={hintClass}>
          Shown on the merchant page. Describe what the store sells — do not make claims you cannot
          support.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={merchant?.status ?? "ACTIVE"}
            className={`${inputClass} mt-1`}
          >
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
          <p className={hintClass}>Disabled merchants are hidden from the public site.</p>
        </div>

        <div>
          <label htmlFor="qualityScore" className={labelClass}>
            Quality score (0-100)
          </label>
          <input
            id="qualityScore"
            name="qualityScore"
            type="number"
            min={0}
            max={100}
            defaultValue={merchant?.qualityScore ?? 50}
            className={`${inputClass} mt-1`}
          />
          <p className={hintClass}>Editorial weighting used by the Deal Score.</p>
          {state.fieldErrors.qualityScore && (
            <p className={errorClass}>{state.fieldErrors.qualityScore}</p>
          )}
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={merchant?.featured}
              className="h-4 w-4 accent-brand-600"
            />
            Featured merchant
          </label>
        </div>
      </div>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Saving…" : merchant ? "Save merchant" : "Create merchant"}
      </button>
    </form>
  );
}
