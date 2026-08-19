/**
 * Core domain vocabulary for the DealScout coupon/deal engine.
 *
 * These types are intentionally merchant-independent: Amazon is modelled as one
 * possible source among many, and new affiliate networks can be added by
 * extending `OFFER_SOURCES` plus registering a connector.
 */

export const DEAL_TYPES = ["PROMO_CODE", "DEAL"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_STATUSES = ["ACTIVE", "EXPIRED", "DISABLED", "PENDING"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const MERCHANT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export const OFFER_SOURCES = [
  "MANUAL",
  "CSV",
  "CJ",
  "AWIN",
  "IMPACT",
  "RAKUTEN",
  "PARTNERIZE",
  "AMAZON",
  "DIRECT",
  "USER_SUBMISSION",
] as const;
export type OfferSource = (typeof OFFER_SOURCES)[number];

export const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const ALERT_STATUSES = ["PENDING_DELIVERY_SETUP", "PAUSED", "UNSUBSCRIBED"] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

/**
 * Traffic channels used for click attribution. `src` query values on /go links
 * are normalised into these buckets so admin analytics can compare channels.
 */
export const TRAFFIC_CHANNELS = [
  "youtube",
  "tiktok",
  "facebook",
  "instagram",
  "pinterest",
  "email",
  "seo_direct",
  "other",
] as const;
export type TrafficChannel = (typeof TRAFFIC_CHANNELS)[number];

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  websiteUrl: string | null;
  affiliateBaseUrl: string | null;
  description: string | null;
  category: string | null;
  status: MerchantStatus;
  featured: boolean;
  /** 0-100 editorial trust/quality weighting used by the deal score. */
  qualityScore: number;
  /** Primary network this merchant is reached through, when known. */
  network: OfferSource | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  merchantId: string;
  title: string;
  slug: string;
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
  verified: boolean;
  lastVerifiedAt: string | null;
  status: DealStatus;
  source: OfferSource;
  sourceExternalId: string | null;
  featured: boolean;
  trending: boolean;
  clickCount: number;
  workedYes: number;
  workedNo: number;
  category: string | null;
  terms: string | null;
  /** Seeded sample records are flagged so the UI never presents them as live offers. */
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A deal joined with its merchant — the shape most UI components consume. */
export interface DealWithMerchant extends Deal {
  merchant: Merchant;
}

export interface Click {
  id: string;
  dealId: string;
  merchantId: string;
  /** Raw `src` parameter, normalised to lowercase and length-capped. */
  src: string | null;
  channel: TrafficChannel;
  /** Referrer hostname only — never the full URL, to avoid collecting extra data. */
  referrerHost: string | null;
  createdAt: string;
}

export interface DealFeedback {
  id: string;
  dealId: string;
  worked: boolean;
  createdAt: string;
}

export interface DealSubmission {
  id: string;
  merchantName: string;
  merchantId: string | null;
  couponCode: string | null;
  description: string;
  destinationUrl: string;
  expiresAt: string | null;
  status: SubmissionStatus;
  reviewerNotes: string | null;
  createdDealId: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface DealAlert {
  id: string;
  email: string;
  merchantId: string | null;
  category: string | null;
  minDiscount: number | null;
  status: AlertStatus;
  createdAt: string;
  lastNotifiedAt: string | null;
}

export interface ImportBatch {
  id: string;
  filename: string | null;
  source: OfferSource;
  createdAt: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  notes: string | null;
  /** JSON-serialised per-row report, kept for import history drill-down. */
  reportJson: string | null;
}

export const DEAL_CATEGORIES = [
  "Electronics",
  "Home & Kitchen",
  "Fashion",
  "Beauty",
  "Sports & Outdoors",
  "Toys & Games",
  "Travel",
  "Food & Drink",
  "Software & Services",
  "Books & Media",
  "Pets",
  "Baby & Kids",
] as const;
export type DealCategory = (typeof DEAL_CATEGORIES)[number];

export function isDealType(value: unknown): value is DealType {
  return typeof value === "string" && (DEAL_TYPES as readonly string[]).includes(value);
}

export function isDealStatus(value: unknown): value is DealStatus {
  return typeof value === "string" && (DEAL_STATUSES as readonly string[]).includes(value);
}

export function isOfferSource(value: unknown): value is OfferSource {
  return typeof value === "string" && (OFFER_SOURCES as readonly string[]).includes(value);
}

export function isMerchantStatus(value: unknown): value is MerchantStatus {
  return typeof value === "string" && (MERCHANT_STATUSES as readonly string[]).includes(value);
}
