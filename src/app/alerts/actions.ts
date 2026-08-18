"use server";

import { getDb } from "@/lib/db/client";
import { alertDeliveryStatus, createAlert } from "@/lib/repos/alerts";
import { getMerchantBySlug } from "@/lib/repos/merchants";
import type { AlertFormState } from "./state";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Stores an alert subscription (store / category / minimum discount).
 *
 * No email is sent: this release has no mail transport, so the response says so
 * rather than implying a notification is on its way.
 */
export async function createAlertAction(
  _previous: AlertFormState,
  formData: FormData,
): Promise<AlertFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const merchantSlug = String(formData.get("merchant") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const minDiscountRaw = String(formData.get("minDiscount") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!EMAIL_PATTERN.test(email) || email.length > 200) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const minDiscount = minDiscountRaw ? Number.parseInt(minDiscountRaw, 10) : null;
  if (minDiscountRaw && (!Number.isFinite(minDiscount) || minDiscount! < 1 || minDiscount! > 100)) {
    fieldErrors.minDiscount = "Choose a discount between 1% and 100%.";
  }

  if (!merchantSlug && !category && !minDiscount) {
    fieldErrors.merchant = "Choose at least a store, a category or a minimum discount to follow.";
  }

  const delivery = alertDeliveryStatus();

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      deliveryConfigured: delivery.configured,
      deliveryNote: delivery.reason,
      fieldErrors,
    };
  }

  const db = getDb();
  const merchant = merchantSlug ? getMerchantBySlug(merchantSlug, db) : null;
  if (merchantSlug && !merchant) {
    return {
      status: "error",
      message: "That store could not be found.",
      deliveryConfigured: delivery.configured,
      deliveryNote: delivery.reason,
      fieldErrors: { merchant: "Unknown store." },
    };
  }

  try {
    createAlert(
      {
        email,
        merchantId: merchant?.id ?? null,
        category: category || null,
        minDiscount: minDiscount ?? null,
      },
      db,
    );
  } catch (error) {
    console.error("Failed to store alert subscription", error);
    return {
      status: "error",
      message: "Something went wrong saving your alert. Please try again.",
      deliveryConfigured: delivery.configured,
      deliveryNote: delivery.reason,
      fieldErrors: {},
    };
  }

  return {
    status: "success",
    message: "Your follow rule has been saved.",
    deliveryConfigured: delivery.configured,
    deliveryNote: delivery.reason,
    fieldErrors: {},
  };
}
