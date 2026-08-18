import { fromDbBool } from "./client";
import type {
  AlertStatus,
  Deal,
  DealAlert,
  DealFeedback,
  DealSubmission,
  DealType,
  DealStatus,
  DealWithMerchant,
  ImportBatch,
  Merchant,
  MerchantStatus,
  OfferSource,
  SubmissionStatus,
  TrafficChannel,
} from "../domain/types";

/** Raw SQLite row shapes. Kept next to the mappers so column drift is obvious. */

export interface MerchantRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  website_url: string | null;
  affiliate_base_url: string | null;
  description: string | null;
  category: string | null;
  status: string;
  featured: number;
  quality_score: number;
  network: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface DealRow {
  id: string;
  merchant_id: string;
  title: string;
  slug: string;
  description: string | null;
  type: string;
  coupon_code: string | null;
  destination_url: string;
  affiliate_url: string | null;
  original_price: number | null;
  sale_price: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  currency: string;
  start_date: string | null;
  expires_at: string | null;
  verified: number;
  last_verified_at: string | null;
  status: string;
  source: string;
  source_external_id: string | null;
  featured: number;
  trending: number;
  click_count: number;
  worked_yes: number;
  worked_no: number;
  category: string | null;
  terms: string | null;
  is_demo: number;
  score: number;
  score_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A deal row selected together with its merchant columns, aliased `m_*`. */
export type DealWithMerchantRow = DealRow & {
  m_id: string;
  m_name: string;
  m_slug: string;
  m_logo: string | null;
  m_website_url: string | null;
  m_affiliate_base_url: string | null;
  m_description: string | null;
  m_category: string | null;
  m_status: string;
  m_featured: number;
  m_quality_score: number;
  m_network: string | null;
  m_is_demo: number;
  m_created_at: string;
  m_updated_at: string;
};

export function mapMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    websiteUrl: row.website_url,
    affiliateBaseUrl: row.affiliate_base_url,
    description: row.description,
    category: row.category,
    status: row.status as MerchantStatus,
    featured: fromDbBool(row.featured),
    qualityScore: row.quality_score,
    network: (row.network as OfferSource | null) ?? null,
    isDemo: fromDbBool(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDeal(row: DealRow): Deal & { score: number } {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    type: row.type as DealType,
    couponCode: row.coupon_code,
    destinationUrl: row.destination_url,
    affiliateUrl: row.affiliate_url,
    originalPrice: row.original_price,
    salePrice: row.sale_price,
    discountPercent: row.discount_percent,
    discountAmount: row.discount_amount,
    currency: row.currency,
    startDate: row.start_date,
    expiresAt: row.expires_at,
    verified: fromDbBool(row.verified),
    lastVerifiedAt: row.last_verified_at,
    status: row.status as DealStatus,
    source: row.source as OfferSource,
    sourceExternalId: row.source_external_id,
    featured: fromDbBool(row.featured),
    trending: fromDbBool(row.trending),
    clickCount: row.click_count,
    workedYes: row.worked_yes,
    workedNo: row.worked_no,
    category: row.category,
    terms: row.terms,
    isDemo: fromDbBool(row.is_demo),
    score: row.score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ScoredDeal = DealWithMerchant & { score: number };

export function mapDealWithMerchant(row: DealWithMerchantRow): ScoredDeal {
  return {
    ...mapDeal(row),
    merchant: mapMerchant({
      id: row.m_id,
      name: row.m_name,
      slug: row.m_slug,
      logo: row.m_logo,
      website_url: row.m_website_url,
      affiliate_base_url: row.m_affiliate_base_url,
      description: row.m_description,
      category: row.m_category,
      status: row.m_status,
      featured: row.m_featured,
      quality_score: row.m_quality_score,
      network: row.m_network,
      is_demo: row.m_is_demo,
      created_at: row.m_created_at,
      updated_at: row.m_updated_at,
    }),
  };
}

/** Column list used by every deal query that joins the merchant. */
export const DEAL_WITH_MERCHANT_COLUMNS = `
  d.*,
  m.id                 AS m_id,
  m.name               AS m_name,
  m.slug               AS m_slug,
  m.logo               AS m_logo,
  m.website_url        AS m_website_url,
  m.affiliate_base_url AS m_affiliate_base_url,
  m.description        AS m_description,
  m.category           AS m_category,
  m.status             AS m_status,
  m.featured           AS m_featured,
  m.quality_score      AS m_quality_score,
  m.network            AS m_network,
  m.is_demo            AS m_is_demo,
  m.created_at         AS m_created_at,
  m.updated_at         AS m_updated_at
`;

export interface ClickRow {
  id: string;
  deal_id: string;
  merchant_id: string;
  src: string | null;
  channel: string;
  referrer_host: string | null;
  created_at: string;
}

export interface FeedbackRow {
  id: string;
  deal_id: string;
  worked: number;
  created_at: string;
}

export function mapFeedback(row: FeedbackRow): DealFeedback {
  return {
    id: row.id,
    dealId: row.deal_id,
    worked: fromDbBool(row.worked),
    createdAt: row.created_at,
  };
}

export interface SubmissionRow {
  id: string;
  merchant_name: string;
  merchant_id: string | null;
  coupon_code: string | null;
  description: string;
  destination_url: string;
  expires_at: string | null;
  status: string;
  reviewer_notes: string | null;
  created_deal_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function mapSubmission(row: SubmissionRow): DealSubmission {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    merchantId: row.merchant_id,
    couponCode: row.coupon_code,
    description: row.description,
    destinationUrl: row.destination_url,
    expiresAt: row.expires_at,
    status: row.status as SubmissionStatus,
    reviewerNotes: row.reviewer_notes,
    createdDealId: row.created_deal_id,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export interface AlertRow {
  id: string;
  email: string;
  merchant_id: string | null;
  category: string | null;
  min_discount: number | null;
  status: string;
  created_at: string;
  last_notified_at: string | null;
}

export function mapAlert(row: AlertRow): DealAlert {
  return {
    id: row.id,
    email: row.email,
    merchantId: row.merchant_id,
    category: row.category,
    minDiscount: row.min_discount,
    status: row.status as AlertStatus,
    createdAt: row.created_at,
    lastNotifiedAt: row.last_notified_at,
  };
}

export interface ImportBatchRow {
  id: string;
  filename: string | null;
  source: string;
  created_at: string;
  total_rows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  dry_run: number;
  notes: string | null;
  report_json: string | null;
}

export function mapImportBatch(row: ImportBatchRow): ImportBatch {
  return {
    id: row.id,
    filename: row.filename,
    source: row.source as OfferSource,
    createdAt: row.created_at,
    totalRows: row.total_rows,
    created: row.created,
    updated: row.updated,
    skipped: row.skipped,
    failed: row.failed,
    dryRun: fromDbBool(row.dry_run),
    notes: row.notes,
    reportJson: row.report_json,
  };
}

export type { TrafficChannel };
