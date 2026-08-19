"use server";

import { getDb } from "@/lib/db/client";
import { createSubmission } from "@/lib/repos/submissions";
import { parseDate } from "@/lib/import/normalize";
import { isSafeHttpUrl, normalizeUrl } from "@/lib/utils/url";
import type { SubmitCouponState } from "./state";

/**
 * Accepts a visitor-submitted coupon. Submissions are always stored as PENDING
 * and never appear on the public site until an administrator approves them.
 */
export async function submitCouponAction(
  _previous: SubmitCouponState,
  formData: FormData,
): Promise<SubmitCouponState> {
  const merchantName = String(formData.get("merchant") ?? "").trim();
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const destinationUrl = String(formData.get("destinationUrl") ?? "").trim();
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();

  const fieldErrors: Record<string, string> = {};

  if (merchantName.length < 2) fieldErrors.merchant = "Enter the store name.";
  if (merchantName.length > 120) fieldErrors.merchant = "Store name is too long.";
  if (description.length < 10) {
    fieldErrors.description = "Describe the offer in at least 10 characters.";
  }
  if (description.length > 600) fieldErrors.description = "Please keep this under 600 characters.";
  if (!destinationUrl) fieldErrors.destinationUrl = "Enter the page this offer applies to.";
  else if (!isSafeHttpUrl(destinationUrl)) {
    fieldErrors.destinationUrl = "Enter a full http(s) address, for example https://store.com/sale.";
  }
  if (couponCode.length > 40) fieldErrors.couponCode = "Coupon codes are usually shorter than this.";

  const expiresAt = expiresRaw ? parseDate(expiresRaw, { endOfDay: true }) : null;
  if (expiresRaw && !expiresAt) fieldErrors.expiresAt = "Use the date picker or a YYYY-MM-DD date.";

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    createSubmission(
      {
        merchantName,
        couponCode: couponCode || null,
        description,
        destinationUrl: normalizeUrl(destinationUrl) ?? destinationUrl,
        expiresAt,
      },
      getDb(),
    );
  } catch (error) {
    console.error("Failed to store coupon submission", error);
    return {
      status: "error",
      message: "Something went wrong saving your submission. Please try again.",
      fieldErrors: {},
    };
  }

  return {
    status: "success",
    message:
      "Thanks — your submission is queued for review. It will only appear on the site if an editor approves it.",
    fieldErrors: {},
  };
}
