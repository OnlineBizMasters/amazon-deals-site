import { isOfferSource, type DealType, type OfferSource } from "../domain/types";
import { normalizeUrl } from "../utils/url";

/**
 * Field-level normalisation for imported rows. Every helper returns `null` for
 * unusable input instead of guessing, so validation can report the problem and
 * the engine never stores fabricated values.
 */

/** Canonical CSV column names accepted by the importer. */
export const IMPORT_COLUMNS = [
  "merchant",
  "title",
  "description",
  "coupon_code",
  "deal_type",
  "destination_url",
  "affiliate_url",
  "original_price",
  "sale_price",
  "discount_percent",
  "discount_amount",
  "currency",
  "start_date",
  "expiration_date",
  "source",
  "external_id",
  "category",
  "terms",
  "merchant_website",
  "verified",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const REQUIRED_COLUMNS: ImportColumn[] = ["merchant", "title", "destination_url"];

/** Common feed spellings mapped onto our canonical column names. */
const COLUMN_ALIASES: Record<string, ImportColumn> = {
  store: "merchant",
  merchant_name: "merchant",
  advertiser: "merchant",
  brand: "merchant",
  retailer: "merchant",
  offer: "title",
  offer_title: "title",
  name: "title",
  deal_title: "title",
  headline: "title",
  offer_description: "description",
  details: "description",
  summary: "description",
  code: "coupon_code",
  promo_code: "coupon_code",
  voucher_code: "coupon_code",
  discount_code: "coupon_code",
  type: "deal_type",
  offer_type: "deal_type",
  coupon_type: "deal_type",
  url: "destination_url",
  landing_url: "destination_url",
  destination: "destination_url",
  deal_url: "destination_url",
  link: "destination_url",
  tracking_url: "affiliate_url",
  affiliate_link: "affiliate_url",
  deeplink: "affiliate_url",
  list_price: "original_price",
  was_price: "original_price",
  retail_price: "original_price",
  price: "sale_price",
  current_price: "sale_price",
  deal_price: "sale_price",
  percent_off: "discount_percent",
  discount: "discount_percent",
  savings_percent: "discount_percent",
  amount_off: "discount_amount",
  savings_amount: "discount_amount",
  starts: "start_date",
  start: "start_date",
  valid_from: "start_date",
  expires: "expiration_date",
  expiry: "expiration_date",
  expires_at: "expiration_date",
  end_date: "expiration_date",
  valid_to: "expiration_date",
  network: "source",
  feed: "source",
  id: "external_id",
  offer_id: "external_id",
  coupon_id: "external_id",
  external_reference: "external_id",
  department: "category",
  vertical: "category",
  restrictions: "terms",
  conditions: "terms",
  website: "merchant_website",
  merchant_url: "merchant_website",
};

/** Maps a raw (already snake_cased) header onto a canonical column, if known. */
export function canonicalColumn(header: string): ImportColumn | null {
  if ((IMPORT_COLUMNS as readonly string[]).includes(header)) return header as ImportColumn;
  return COLUMN_ALIASES[header] ?? null;
}

export function remapRow(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const column = canonicalColumn(key);
    if (column && !mapped[column]) mapped[column] = value;
  }
  return mapped;
}

export function cleanText(value: string | undefined | null, maxLength = 500): string | null {
  if (!value) return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function normalizeCouponCode(value: string | undefined | null): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!code || code === "NONE" || code === "N/A" || code === "-") return null;
  if (code.length > 40) return null;
  return code;
}

/**
 * Infers the deal type. An explicit value wins; otherwise the presence of a
 * coupon code decides.
 */
export function normalizeDealType(
  value: string | undefined | null,
  couponCode: string | null,
): DealType {
  const text = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (text === "PROMO_CODE" || text === "CODE" || text === "COUPON" || text === "COUPON_CODE") {
    return "PROMO_CODE";
  }
  if (text === "DEAL" || text === "SALE" || text === "OFFER" || text === "DISCOUNT") return "DEAL";
  return couponCode ? "PROMO_CODE" : "DEAL";
}

export function normalizeSource(value: string | undefined | null, fallback: OfferSource): OfferSource {
  const text = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!text) return fallback;
  if (isOfferSource(text)) return text;
  if (text === "CJ_AFFILIATE" || text === "COMMISSION_JUNCTION") return "CJ";
  if (text === "RAKUTEN_ADVERTISING" || text === "LINKSHARE") return "RAKUTEN";
  if (text === "IMPACT_RADIUS") return "IMPACT";
  if (text === "AWIN_COM" || text === "ZANOX") return "AWIN";
  if (text === "AMAZON_ASSOCIATES" || text === "PAAPI") return "AMAZON";
  return fallback;
}

/** Parses money-ish strings: `$1,299.00`, `1299`, `1.299,00 EUR`. */
export function parsePrice(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal separator.
    if (lastComma > lastDot) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    else cleaned = cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = cleaned.length - lastComma - 1;
    cleaned = decimals === 3 ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  }

  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function parsePercent(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const parsed = Number.parseFloat(raw.replace(/[^\d.,-]/g, "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  // A "0.4" style fraction is treated as 40%.
  const percent = parsed > 0 && parsed <= 1 && raw.includes(".") ? parsed * 100 : parsed;
  if (percent > 100) return null;
  return Math.round(percent * 100) / 100;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Parses a date into an ISO timestamp. Date-only values become end-of-day UTC for
 * expiry columns so an offer stays live through its final day.
 */
export function parseDate(
  value: string | undefined | null,
  options: { endOfDay?: boolean } = {},
): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const dateOnly = raw.match(DATE_ONLY);
  if (dateOnly) {
    const suffix = options.endOfDay ? "T23:59:59.000Z" : "T00:00:00.000Z";
    const iso = `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}${suffix}`;
    return Number.isNaN(new Date(iso).getTime()) ? null : iso;
  }

  const us = raw.match(US_DATE);
  if (us) {
    const month = us[1].padStart(2, "0");
    const day = us[2].padStart(2, "0");
    const suffix = options.endOfDay ? "T23:59:59.000Z" : "T00:00:00.000Z";
    const iso = `${us[3]}-${month}-${day}${suffix}`;
    return Number.isNaN(new Date(iso).getTime()) ? null : iso;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function parseBoolean(value: string | undefined | null): boolean {
  const text = (value ?? "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "y";
}

export function normalizeCurrency(value: string | undefined | null): string {
  const text = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(text) ? text : "USD";
}

export { normalizeUrl };
