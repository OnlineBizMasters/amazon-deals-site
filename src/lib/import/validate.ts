import {
  cleanText,
  normalizeCouponCode,
  normalizeCurrency,
  normalizeDealType,
  normalizeSource,
  normalizeUrl,
  parseBoolean,
  parseDate,
  parsePercent,
  parsePrice,
  remapRow,
} from "./normalize";
import { isSafeHttpUrl } from "../utils/url";
import type { DealType, OfferSource } from "../domain/types";

/** A row that passed validation, ready for duplicate checks and persistence. */
export interface NormalizedOffer {
  merchantName: string;
  merchantWebsite: string | null;
  title: string;
  description: string | null;
  type: DealType;
  couponCode: string | null;
  destinationUrl: string;
  affiliateUrl: string | null;
  originalPrice: number | null;
  salePrice: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  currency: string;
  startDate: string | null;
  expiresAt: string | null;
  source: OfferSource;
  externalId: string | null;
  category: string | null;
  terms: string | null;
  verified: boolean;
}

export interface RowIssue {
  field: string;
  message: string;
}

export interface ValidatedRow {
  /** 1-based row number within the data section (header excluded). */
  rowNumber: number;
  /** 1-based line number in the source file. */
  lineNumber: number;
  raw: Record<string, string>;
  offer: NormalizedOffer | null;
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface ValidateOptions {
  /** Source applied when a row does not name one. */
  defaultSource?: OfferSource;
  now?: Date;
}

const MAX_TITLE = 180;

export function validateRow(
  rawRow: Record<string, string>,
  rowNumber: number,
  lineNumber: number,
  options: ValidateOptions = {},
): ValidatedRow {
  const raw = remapRow(rawRow);
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const now = options.now ?? new Date();

  const merchantName = cleanText(raw.merchant, 120);
  if (!merchantName) errors.push({ field: "merchant", message: "Merchant name is required" });

  const title = cleanText(raw.title, MAX_TITLE);
  if (!title) errors.push({ field: "title", message: "Title is required" });
  else if (title.length < 5) {
    warnings.push({ field: "title", message: "Title is very short and may read poorly on the site" });
  }

  const destinationRaw = raw.destination_url;
  const destinationUrl = normalizeUrl(destinationRaw);
  if (!destinationRaw?.trim()) {
    errors.push({ field: "destination_url", message: "Destination URL is required" });
  } else if (!destinationUrl) {
    errors.push({
      field: "destination_url",
      message: "Destination URL must be an absolute http(s) address",
    });
  }

  const affiliateUrl = raw.affiliate_url?.trim() ? normalizeUrl(raw.affiliate_url) : null;
  if (raw.affiliate_url?.trim() && !affiliateUrl) {
    warnings.push({
      field: "affiliate_url",
      message: "Affiliate URL is not a valid http(s) address and was dropped",
    });
  }

  const couponCode = normalizeCouponCode(raw.coupon_code);
  if (raw.coupon_code?.trim() && !couponCode) {
    warnings.push({ field: "coupon_code", message: "Coupon code could not be read and was dropped" });
  }

  const type = normalizeDealType(raw.deal_type, couponCode);
  if (type === "PROMO_CODE" && !couponCode) {
    errors.push({
      field: "coupon_code",
      message: "Rows typed PROMO_CODE must include a coupon code",
    });
  }

  const originalPrice = parsePrice(raw.original_price);
  const salePrice = parsePrice(raw.sale_price);
  if (raw.original_price?.trim() && originalPrice === null) {
    warnings.push({ field: "original_price", message: "Original price could not be parsed" });
  }
  if (raw.sale_price?.trim() && salePrice === null) {
    warnings.push({ field: "sale_price", message: "Sale price could not be parsed" });
  }
  if (originalPrice !== null && salePrice !== null && salePrice > originalPrice) {
    warnings.push({
      field: "sale_price",
      message: "Sale price is higher than the original price — no discount will be shown",
    });
  }

  const discountPercent = parsePercent(raw.discount_percent);
  if (raw.discount_percent?.trim() && discountPercent === null) {
    warnings.push({
      field: "discount_percent",
      message: "Discount percent could not be parsed (must be 0-100)",
    });
  }

  const discountAmount = parsePrice(raw.discount_amount);

  const startDate = parseDate(raw.start_date);
  if (raw.start_date?.trim() && !startDate) {
    warnings.push({ field: "start_date", message: "Start date could not be parsed" });
  }

  const expiresAt = parseDate(raw.expiration_date, { endOfDay: true });
  if (raw.expiration_date?.trim() && !expiresAt) {
    warnings.push({ field: "expiration_date", message: "Expiration date could not be parsed" });
  }
  if (expiresAt && new Date(expiresAt).getTime() < now.getTime()) {
    warnings.push({
      field: "expiration_date",
      message: "Expiration date is in the past — the deal will be imported as EXPIRED",
    });
  }
  if (startDate && expiresAt && new Date(startDate) > new Date(expiresAt)) {
    errors.push({ field: "start_date", message: "Start date is after the expiration date" });
  }

  const merchantWebsite = raw.merchant_website?.trim() ? normalizeUrl(raw.merchant_website) : null;
  if (raw.merchant_website?.trim() && !isSafeHttpUrl(raw.merchant_website)) {
    warnings.push({ field: "merchant_website", message: "Merchant website URL is not valid" });
  }

  const offer: NormalizedOffer | null =
    errors.length === 0 && merchantName && title && destinationUrl
      ? {
          merchantName,
          merchantWebsite,
          title,
          description: cleanText(raw.description, 1200),
          type,
          couponCode,
          destinationUrl,
          affiliateUrl,
          originalPrice,
          salePrice,
          discountPercent,
          discountAmount,
          currency: normalizeCurrency(raw.currency),
          startDate,
          expiresAt,
          source: normalizeSource(raw.source, options.defaultSource ?? "CSV"),
          externalId: cleanText(raw.external_id, 120),
          category: cleanText(raw.category, 60),
          terms: cleanText(raw.terms, 600),
          verified: parseBoolean(raw.verified),
        }
      : null;

  return { rowNumber, lineNumber, raw, offer, errors, warnings };
}

export interface HeaderCheck {
  missingRequired: string[];
  unknown: string[];
  recognised: string[];
}

/** Reports header problems before any row is processed. */
export function checkHeaders(headers: string[]): HeaderCheck {
  const mapped = new Map<string, string>();
  const unknown: string[] = [];

  for (const header of headers) {
    if (!header) continue;
    const remapped = remapRow({ [header]: "" });
    const [canonical] = Object.keys(remapped);
    if (canonical) mapped.set(canonical, header);
    else unknown.push(header);
  }

  const missingRequired = ["merchant", "title", "destination_url"].filter(
    (column) => !mapped.has(column),
  );

  return { missingRequired, unknown, recognised: [...mapped.keys()] };
}
