"use client";

import { useActionState, useState } from "react";
import {
  errorClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form";
import { DEAL_CATEGORIES, DEAL_STATUSES, OFFER_SOURCES } from "@/lib/domain/types";
import type { ScoredDeal } from "@/lib/db/mappers";
import { createDealAction, updateDealAction } from "./actions";
import { initialDealFormState } from "./state";

/** Trims an ISO timestamp down to the YYYY-MM-DD a date input expects. */
function dateValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export default function DealForm({
  deal,
  merchants,
  defaultMerchantId,
}: {
  deal?: ScoredDeal;
  merchants: { id: string; name: string }[];
  defaultMerchantId?: string;
}) {
  const action = deal ? updateDealAction : createDealAction;
  const [state, formAction, pending] = useActionState(action, initialDealFormState);
  const [type, setType] = useState(deal?.type ?? "PROMO_CODE");

  return (
    <form action={formAction} className="space-y-6">
      {deal && <input type="hidden" name="id" value={deal.id} />}

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

      <fieldset className="space-y-5">
        <legend className="text-sm font-bold uppercase tracking-wide text-slate-500">
          The offer
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="merchantId" className={labelClass}>
              Merchant <span className="text-rose-600">*</span>
            </label>
            <select
              id="merchantId"
              name="merchantId"
              required
              defaultValue={deal?.merchantId ?? defaultMerchantId ?? ""}
              className={`${inputClass} mt-1`}
            >
              <option value="">Select a merchant…</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
            {state.fieldErrors.merchantId && (
              <p className={errorClass}>{state.fieldErrors.merchantId}</p>
            )}
          </div>

          <div>
            <label htmlFor="type" className={labelClass}>
              Type <span className="text-rose-600">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as "PROMO_CODE" | "DEAL")}
              className={`${inputClass} mt-1`}
            >
              <option value="PROMO_CODE">Promo code — visitor needs a code</option>
              <option value="DEAL">Deal — no code needed</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="title" className={labelClass}>
            Title <span className="text-rose-600">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={180}
            defaultValue={deal?.title}
            placeholder="20% off full-price styles for members"
            className={`${inputClass} mt-1`}
          />
          <p className={hintClass}>
            Describe what the visitor actually gets. Do not state a discount the merchant has not.
          </p>
          {state.fieldErrors.title && <p className={errorClass}>{state.fieldErrors.title}</p>}
        </div>

        {type === "PROMO_CODE" && (
          <div>
            <label htmlFor="couponCode" className={labelClass}>
              Coupon code <span className="text-rose-600">*</span>
            </label>
            <input
              id="couponCode"
              name="couponCode"
              maxLength={40}
              defaultValue={deal?.couponCode ?? ""}
              className={`${inputClass} mt-1 font-mono uppercase`}
            />
            {state.fieldErrors.couponCode && (
              <p className={errorClass}>{state.fieldErrors.couponCode}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1200}
            defaultValue={deal?.description ?? ""}
            className={`${inputClass} mt-1`}
          />
        </div>

        <div>
          <label htmlFor="terms" className={labelClass}>
            Terms supplied by the merchant
          </label>
          <textarea
            id="terms"
            name="terms"
            rows={2}
            maxLength={600}
            defaultValue={deal?.terms ?? ""}
            className={`${inputClass} mt-1`}
          />
          <p className={hintClass}>
            Shown with the code. Copy the merchant&apos;s wording rather than paraphrasing.
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-slate-200 pt-5">
        <legend className="text-sm font-bold uppercase tracking-wide text-slate-500">Links</legend>

        <div>
          <label htmlFor="destinationUrl" className={labelClass}>
            Destination URL <span className="text-rose-600">*</span>
          </label>
          <input
            id="destinationUrl"
            name="destinationUrl"
            type="url"
            required
            defaultValue={deal?.destinationUrl}
            placeholder="https://www.store.com/sale"
            className={`${inputClass} mt-1`}
          />
          <p className={hintClass}>Where the visitor should land on the merchant&apos;s site.</p>
          {state.fieldErrors.destinationUrl && (
            <p className={errorClass}>{state.fieldErrors.destinationUrl}</p>
          )}
        </div>

        <div>
          <label htmlFor="affiliateUrl" className={labelClass}>
            Affiliate / tracking URL
          </label>
          <input
            id="affiliateUrl"
            name="affiliateUrl"
            type="url"
            defaultValue={deal?.affiliateUrl ?? ""}
            className={`${inputClass} mt-1`}
          />
          <p className={hintClass}>
            Optional. When blank we fall back to the merchant&apos;s deep-link template, then the
            Amazon Associates tag for Amazon URLs, then the plain destination. This URL is never shown
            to visitors — they only see <code>/go/&lt;id&gt;</code>.
          </p>
          {state.fieldErrors.affiliateUrl && (
            <p className={errorClass}>{state.fieldErrors.affiliateUrl}</p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-slate-200 pt-5">
        <legend className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Discount and prices
        </legend>
        <p className="text-xs text-slate-500">
          Leave a field blank when you do not have the figure. Blank fields are simply not displayed —
          a missing discount lowers the Deal Score rather than being guessed at.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="discountPercent" className={labelClass}>
              Discount %
            </label>
            <input
              id="discountPercent"
              name="discountPercent"
              inputMode="decimal"
              defaultValue={deal?.discountPercent ?? ""}
              className={`${inputClass} mt-1`}
            />
            {state.fieldErrors.discountPercent && (
              <p className={errorClass}>{state.fieldErrors.discountPercent}</p>
            )}
          </div>

          <div>
            <label htmlFor="discountAmount" className={labelClass}>
              Discount amount
            </label>
            <input
              id="discountAmount"
              name="discountAmount"
              inputMode="decimal"
              defaultValue={deal?.discountAmount ?? ""}
              className={`${inputClass} mt-1`}
            />
          </div>

          <div>
            <label htmlFor="originalPrice" className={labelClass}>
              Original price
            </label>
            <input
              id="originalPrice"
              name="originalPrice"
              inputMode="decimal"
              defaultValue={deal?.originalPrice ?? ""}
              className={`${inputClass} mt-1`}
            />
            {state.fieldErrors.originalPrice && (
              <p className={errorClass}>{state.fieldErrors.originalPrice}</p>
            )}
          </div>

          <div>
            <label htmlFor="salePrice" className={labelClass}>
              Sale price
            </label>
            <input
              id="salePrice"
              name="salePrice"
              inputMode="decimal"
              defaultValue={deal?.salePrice ?? ""}
              className={`${inputClass} mt-1`}
            />
            {state.fieldErrors.salePrice && <p className={errorClass}>{state.fieldErrors.salePrice}</p>}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="currency" className={labelClass}>
              Currency
            </label>
            <input
              id="currency"
              name="currency"
              maxLength={3}
              defaultValue={deal?.currency ?? "USD"}
              className={`${inputClass} mt-1 uppercase`}
            />
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <input
              id="category"
              name="category"
              list="deal-categories"
              defaultValue={deal?.category ?? ""}
              className={`${inputClass} mt-1`}
            />
            <datalist id="deal-categories">
              {DEAL_CATEGORIES.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <p className={hintClass}>Defaults to the merchant&apos;s category.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-slate-200 pt-5">
        <legend className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Dates and status
        </legend>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="startDate" className={labelClass}>
              Starts
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={dateValue(deal?.startDate ?? null)}
              className={`${inputClass} mt-1`}
            />
            {state.fieldErrors.startDate && <p className={errorClass}>{state.fieldErrors.startDate}</p>}
          </div>

          <div>
            <label htmlFor="expiresAt" className={labelClass}>
              Expires
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              defaultValue={dateValue(deal?.expiresAt ?? null)}
              className={`${inputClass} mt-1`}
            />
            <p className={hintClass}>
              Only if the merchant stated one. Past dates become EXPIRED automatically.
            </p>
            {state.fieldErrors.expiresAt && <p className={errorClass}>{state.fieldErrors.expiresAt}</p>}
          </div>

          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={deal?.status ?? "ACTIVE"}
              className={`${inputClass} mt-1`}
            >
              {DEAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="source" className={labelClass}>
              Source
            </label>
            <select
              id="source"
              name="source"
              defaultValue={deal?.source ?? "MANUAL"}
              className={`${inputClass} mt-1`}
            >
              {OFFER_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="sourceExternalId" className={labelClass}>
            Source external ID
          </label>
          <input
            id="sourceExternalId"
            name="sourceExternalId"
            defaultValue={deal?.sourceExternalId ?? ""}
            className={`${inputClass} mt-1 font-mono text-xs`}
          />
          <p className={hintClass}>
            The upstream feed&apos;s own id. Combined with the source it must be unique, and it is what
            lets a re-import update this record instead of duplicating it.
          </p>
        </div>

        <div>
          <label htmlFor="slug" className={labelClass}>
            URL slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={deal?.slug ?? ""}
            placeholder="auto-generated from merchant + title"
            className={`${inputClass} mt-1 font-mono text-xs`}
          />
        </div>

        <div className="flex flex-wrap gap-6 rounded-xl bg-slate-50 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="verified"
              defaultChecked={deal?.verified}
              className="h-4 w-4 accent-brand-600"
            />
            Verified (records today&apos;s date)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={deal?.featured}
              className="h-4 w-4 accent-brand-600"
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="trending"
              defaultChecked={deal?.trending}
              className="h-4 w-4 accent-brand-600"
            />
            Trending
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Marking an offer Trending shows the badge publicly. Without the flag, the badge appears only
          when recorded clicks and feedback support it.
        </p>
      </fieldset>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Saving…" : deal ? "Save deal" : "Create deal"}
      </button>
    </form>
  );
}
