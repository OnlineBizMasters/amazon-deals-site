"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import {
  createDeal,
  deleteDeal,
  getDealById,
  markDealVerified,
  setDealStatus,
  toggleDealFlag,
  updateDeal,
} from "@/lib/repos/deals";
import { getMerchantById } from "@/lib/repos/merchants";
import { isDealStatus, isDealType, isOfferSource } from "@/lib/domain/types";
import { parseDate, parsePercent, parsePrice } from "@/lib/import/normalize";
import { isSafeHttpUrl } from "@/lib/utils/url";
import { requireAdmin } from "@/lib/auth/session";
import type { DealFormState } from "./state";

function readDealForm(formData: FormData) {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    merchantId: get("merchantId"),
    title: get("title"),
    slug: get("slug"),
    description: get("description"),
    typeRaw: get("type"),
    couponCode: get("couponCode"),
    destinationUrl: get("destinationUrl"),
    affiliateUrl: get("affiliateUrl"),
    originalPrice: get("originalPrice"),
    salePrice: get("salePrice"),
    discountPercent: get("discountPercent"),
    discountAmount: get("discountAmount"),
    currency: get("currency"),
    startDate: get("startDate"),
    expiresAt: get("expiresAt"),
    statusRaw: get("status"),
    sourceRaw: get("source"),
    sourceExternalId: get("sourceExternalId"),
    category: get("category"),
    terms: get("terms"),
    verified: formData.get("verified") === "on",
    featured: formData.get("featured") === "on",
    trending: formData.get("trending") === "on",
  };
}

type DealInputFields = ReturnType<typeof readDealForm>;

function validateDeal(input: DealInputFields, db = getDb()): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!input.merchantId || !getMerchantById(input.merchantId, db)) {
    fieldErrors.merchantId = "Choose a merchant.";
  }
  if (input.title.length < 5) fieldErrors.title = "Enter a title of at least 5 characters.";
  if (input.title.length > 180) fieldErrors.title = "Title is too long.";

  if (!input.destinationUrl) fieldErrors.destinationUrl = "A destination URL is required.";
  else if (!isSafeHttpUrl(input.destinationUrl)) {
    fieldErrors.destinationUrl = "Enter a full http(s) address.";
  }

  if (input.affiliateUrl && !isSafeHttpUrl(input.affiliateUrl)) {
    fieldErrors.affiliateUrl = "Enter a full http(s) address, or leave blank.";
  }

  const type = isDealType(input.typeRaw) ? input.typeRaw : "DEAL";
  if (type === "PROMO_CODE" && !input.couponCode) {
    fieldErrors.couponCode = "Promo-code offers need a code. Switch the type to Deal if there is none.";
  }

  if (input.discountPercent && parsePercent(input.discountPercent) === null) {
    fieldErrors.discountPercent = "Enter a percentage between 0 and 100.";
  }
  if (input.originalPrice && parsePrice(input.originalPrice) === null) {
    fieldErrors.originalPrice = "Enter a valid amount.";
  }
  if (input.salePrice && parsePrice(input.salePrice) === null) {
    fieldErrors.salePrice = "Enter a valid amount.";
  }
  if (input.expiresAt && !parseDate(input.expiresAt, { endOfDay: true })) {
    fieldErrors.expiresAt = "Use the date picker or a YYYY-MM-DD date.";
  }
  if (input.startDate && !parseDate(input.startDate)) {
    fieldErrors.startDate = "Use the date picker or a YYYY-MM-DD date.";
  }

  return fieldErrors;
}

function toDealPayload(input: DealInputFields) {
  return {
    merchantId: input.merchantId,
    title: input.title,
    slug: input.slug || undefined,
    description: input.description || null,
    type: isDealType(input.typeRaw) ? input.typeRaw : ("DEAL" as const),
    couponCode: input.couponCode || null,
    destinationUrl: input.destinationUrl,
    affiliateUrl: input.affiliateUrl || null,
    originalPrice: parsePrice(input.originalPrice),
    salePrice: parsePrice(input.salePrice),
    discountPercent: parsePercent(input.discountPercent),
    discountAmount: parsePrice(input.discountAmount),
    currency: input.currency || "USD",
    startDate: input.startDate ? parseDate(input.startDate) : null,
    expiresAt: input.expiresAt ? parseDate(input.expiresAt, { endOfDay: true }) : null,
    status: isDealStatus(input.statusRaw) ? input.statusRaw : ("ACTIVE" as const),
    source: isOfferSource(input.sourceRaw) ? input.sourceRaw : ("MANUAL" as const),
    sourceExternalId: input.sourceExternalId || null,
    category: input.category || null,
    terms: input.terms || null,
    verified: input.verified,
    featured: input.featured,
    trending: input.trending,
  };
}

function revalidateDeal(slug: string, merchantSlug?: string): void {
  revalidatePath("/");
  revalidatePath("/admin/deals");
  revalidatePath(`/deal/${slug}`);
  if (merchantSlug) revalidatePath(`/coupons/${merchantSlug}`);
}

export async function createDealAction(
  _previous: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  await requireAdmin("/admin/deals/new");

  const db = getDb();
  const input = readDealForm(formData);
  const fieldErrors = validateDeal(input, db);

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  let dealId: string;
  try {
    const deal = createDeal(toDealPayload(input), db);
    dealId = deal.id;
    revalidateDeal(deal.slug, deal.merchant.slug);
  } catch (error) {
    console.error("Failed to create deal", error);
    return {
      status: "error",
      message:
        error instanceof Error && error.message.includes("UNIQUE")
          ? "A deal with that source and external ID already exists."
          : "Could not save the deal. Please try again.",
      fieldErrors: {},
    };
  }

  redirect(`/admin/deals/${dealId}?created=1`);
}

export async function updateDealAction(
  _previous: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  const id = String(formData.get("id") ?? "");
  await requireAdmin(`/admin/deals/${id}`);

  const db = getDb();
  const input = readDealForm(formData);
  const fieldErrors = validateDeal(input, db);

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    const deal = updateDeal(id, toDealPayload(input), db);
    if (!deal) {
      return { status: "error", message: "That deal no longer exists.", fieldErrors: {} };
    }
    revalidateDeal(deal.slug, deal.merchant.slug);
    revalidatePath(`/admin/deals/${id}`);
  } catch (error) {
    console.error("Failed to update deal", error);
    return { status: "error", message: "Could not save the deal. Please try again.", fieldErrors: {} };
  }

  return { status: "success", message: "Deal saved.", fieldErrors: {} };
}

/**
 * Manual verification. Recording who-checked-when is the whole point, so the
 * timestamp is always written alongside the flag.
 */
export async function verifyDealAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const verified = String(formData.get("verified") ?? "1") === "1";
  await requireAdmin(`/admin/deals/${id}`);

  const deal = markDealVerified(id, verified, getDb());
  if (deal) revalidateDeal(deal.slug, deal.merchant.slug);
  revalidatePath(`/admin/deals/${id}`);
}

export async function toggleFlagAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const flag = String(formData.get("flag") ?? "");
  const value = String(formData.get("value") ?? "1") === "1";
  await requireAdmin(`/admin/deals/${id}`);

  if (flag !== "featured" && flag !== "trending") return;

  const deal = toggleDealFlag(id, flag, value, getDb());
  if (deal) revalidateDeal(deal.slug, deal.merchant.slug);
  revalidatePath(`/admin/deals/${id}`);
}

export async function setDealStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  await requireAdmin(`/admin/deals/${id}`);

  if (!isDealStatus(status)) return;

  const deal = setDealStatus(id, status, getDb());
  if (deal) revalidateDeal(deal.slug, deal.merchant.slug);
  revalidatePath(`/admin/deals/${id}`);
}

/**
 * Hard delete. Offers with recorded clicks are kept instead, so analytics history
 * is never silently destroyed — disable those.
 */
export async function deleteDealAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await requireAdmin("/admin/deals");

  const db = getDb();
  const deal = getDealById(id, db);
  if (!deal) redirect("/admin/deals");

  if (deal.clickCount > 0) {
    redirect(`/admin/deals/${id}?error=has-clicks`);
  }

  deleteDeal(id, db);
  revalidateDeal(deal.slug, deal.merchant.slug);
  redirect("/admin/deals?deleted=1");
}
