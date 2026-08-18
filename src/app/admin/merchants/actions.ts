"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { createMerchant, deleteMerchant, updateMerchant } from "@/lib/repos/merchants";
import { countDeals } from "@/lib/repos/deals";
import { isMerchantStatus, isOfferSource } from "@/lib/domain/types";
import { isSafeHttpUrl } from "@/lib/utils/url";
import { requireAdmin } from "@/lib/auth/session";
import type { MerchantFormState } from "./state";

function readMerchantForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
    logo: String(formData.get("logo") ?? "").trim(),
    affiliateBaseUrl: String(formData.get("affiliateBaseUrl") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    statusRaw: String(formData.get("status") ?? "ACTIVE"),
    networkRaw: String(formData.get("network") ?? "").trim(),
    featured: formData.get("featured") === "on",
    qualityScoreRaw: String(formData.get("qualityScore") ?? "50"),
  };
}

function validate(input: ReturnType<typeof readMerchantForm>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (input.name.length < 2) fieldErrors.name = "Enter the merchant name.";
  if (input.name.length > 120) fieldErrors.name = "Name is too long.";
  if (input.websiteUrl && !isSafeHttpUrl(input.websiteUrl)) {
    fieldErrors.websiteUrl = "Enter a full http(s) address.";
  }
  if (input.logo && !isSafeHttpUrl(input.logo)) {
    fieldErrors.logo = "Logo must be a full http(s) image URL.";
  }
  if (input.affiliateBaseUrl && !isSafeHttpUrl(input.affiliateBaseUrl.replace("{destination}", "x"))) {
    fieldErrors.affiliateBaseUrl = "Enter a full http(s) deep-link template.";
  }

  const quality = Number.parseInt(input.qualityScoreRaw, 10);
  if (!Number.isFinite(quality) || quality < 0 || quality > 100) {
    fieldErrors.qualityScore = "Quality score must be between 0 and 100.";
  }

  return fieldErrors;
}

export async function createMerchantAction(
  _previous: MerchantFormState,
  formData: FormData,
): Promise<MerchantFormState> {
  await requireAdmin("/admin/merchants/new");

  const input = readMerchantForm(formData);
  const fieldErrors = validate(input);

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const merchant = createMerchant(
    {
      name: input.name,
      slug: input.slug || undefined,
      websiteUrl: input.websiteUrl || null,
      logo: input.logo || null,
      affiliateBaseUrl: input.affiliateBaseUrl || null,
      description: input.description || null,
      category: input.category || null,
      status: isMerchantStatus(input.statusRaw) ? input.statusRaw : "ACTIVE",
      network: isOfferSource(input.networkRaw) ? input.networkRaw : null,
      featured: input.featured,
      qualityScore: Number.parseInt(input.qualityScoreRaw, 10),
    },
    getDb(),
  );

  revalidatePath("/admin/merchants");
  revalidatePath("/stores");
  redirect(`/admin/merchants/${merchant.id}?created=1`);
}

export async function updateMerchantAction(
  _previous: MerchantFormState,
  formData: FormData,
): Promise<MerchantFormState> {
  const id = String(formData.get("id") ?? "");
  await requireAdmin(`/admin/merchants/${id}`);

  const input = readMerchantForm(formData);
  const fieldErrors = validate(input);

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const db = getDb();
  const merchant = updateMerchant(
    id,
    {
      name: input.name,
      slug: input.slug || undefined,
      websiteUrl: input.websiteUrl || null,
      logo: input.logo || null,
      affiliateBaseUrl: input.affiliateBaseUrl || null,
      description: input.description || null,
      category: input.category || null,
      status: isMerchantStatus(input.statusRaw) ? input.statusRaw : "ACTIVE",
      network: isOfferSource(input.networkRaw) ? input.networkRaw : null,
      featured: input.featured,
      qualityScore: Number.parseInt(input.qualityScoreRaw, 10),
    },
    db,
  );

  if (!merchant) {
    return { status: "error", message: "That merchant no longer exists.", fieldErrors: {} };
  }

  revalidatePath("/admin/merchants");
  revalidatePath(`/admin/merchants/${id}`);
  revalidatePath(`/coupons/${merchant.slug}`);
  revalidatePath("/stores");

  return { status: "success", message: "Merchant saved.", fieldErrors: {} };
}

/** Disabling hides a merchant and its offers from the public site without data loss. */
export async function setMerchantStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  await requireAdmin("/admin/merchants");

  if (!isMerchantStatus(status)) return;

  const db = getDb();
  const merchant = updateMerchant(id, { status }, db);

  revalidatePath("/admin/merchants");
  if (merchant) revalidatePath(`/coupons/${merchant.slug}`);
  revalidatePath("/stores");
}

/** Deletion is only allowed while a merchant has no offers attached. */
export async function deleteMerchantAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await requireAdmin("/admin/merchants");

  const db = getDb();
  if (countDeals({ merchantId: id, status: "ALL" }, db) > 0) {
    redirect(`/admin/merchants/${id}?error=has-deals`);
  }

  deleteMerchant(id, db);
  revalidatePath("/admin/merchants");
  revalidatePath("/stores");
  redirect("/admin/merchants?deleted=1");
}
