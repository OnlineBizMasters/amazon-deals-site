import { getDb, newId, nowIso, type Db } from "../db/client";
import { mapAlert, type AlertRow } from "../db/mappers";
import type { DealAlert } from "../domain/types";

export interface AlertInput {
  email: string;
  merchantId?: string | null;
  category?: string | null;
  minDiscount?: number | null;
}

/**
 * Alert subscriptions are stored so the follow rules exist, but nothing is
 * delivered in V1: there is no email provider configured, and the engine does not
 * pretend to send mail. Rows are created with status PENDING_DELIVERY_SETUP.
 */
export function createAlert(input: AlertInput, db: Db = getDb()): DealAlert {
  const id = newId();
  const createdAt = nowIso();
  const email = input.email.trim().toLowerCase();

  db.prepare(
    `INSERT INTO deal_alerts (id, email, merchant_id, category, min_discount, status, created_at, last_notified_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING_DELIVERY_SETUP', ?, NULL)
     ON CONFLICT DO NOTHING`,
  ).run(
    id,
    email,
    input.merchantId ?? null,
    input.category ?? null,
    typeof input.minDiscount === "number" ? Math.round(input.minDiscount) : null,
    createdAt,
  );

  const row = db
    .prepare<unknown[], AlertRow>(
      `SELECT * FROM deal_alerts
        WHERE email = ?
          AND IFNULL(merchant_id, '') = IFNULL(?, '')
          AND IFNULL(category, '') = IFNULL(?, '')
          AND IFNULL(min_discount, -1) = IFNULL(?, -1)
        LIMIT 1`,
    )
    .get(
      email,
      input.merchantId ?? null,
      input.category ?? null,
      typeof input.minDiscount === "number" ? Math.round(input.minDiscount) : null,
    );

  if (!row) throw new Error("Failed to store alert subscription");
  return mapAlert(row);
}

export function listAlerts(limit = 200, db: Db = getDb()): DealAlert[] {
  return db
    .prepare<unknown[], AlertRow>("SELECT * FROM deal_alerts ORDER BY created_at DESC LIMIT ?")
    .all(limit)
    .map(mapAlert);
}

export function countAlerts(db: Db = getDb()): number {
  const row = db
    .prepare<unknown[], { count: number }>("SELECT COUNT(*) AS count FROM deal_alerts")
    .get();
  return row?.count ?? 0;
}

export function deleteAlert(id: string, db: Db = getDb()): boolean {
  return db.prepare("DELETE FROM deal_alerts WHERE id = ?").run(id).changes > 0;
}

export interface AlertDeliveryStatus {
  configured: boolean;
  provider: string | null;
  reason: string;
}

/**
 * Reports whether alert delivery could actually happen. V1 ships no email
 * transport, so unless a provider is configured this returns `configured: false`
 * and the UI says so plainly instead of implying mail was sent.
 */
export function alertDeliveryStatus(): AlertDeliveryStatus {
  const provider = process.env.EMAIL_PROVIDER?.trim() || null;
  const apiKey = process.env.EMAIL_API_KEY?.trim();
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();

  if (!provider) {
    return {
      configured: false,
      provider: null,
      reason:
        "No email provider is configured. Set EMAIL_PROVIDER, EMAIL_API_KEY and EMAIL_FROM_ADDRESS, then implement a transport in src/lib/repos/alerts.ts to enable delivery.",
    };
  }

  if (!apiKey || !from) {
    return {
      configured: false,
      provider,
      reason: `EMAIL_PROVIDER is set to "${provider}" but EMAIL_API_KEY and/or EMAIL_FROM_ADDRESS are missing, so no mail can be sent.`,
    };
  }

  return {
    configured: false,
    provider,
    reason: `Credentials for "${provider}" are present, but this release does not include a sending transport. Alerts are stored only.`,
  };
}

/**
 * Resolves which stored subscriptions a deal matches. This powers the future
 * notification job; it performs no sending.
 */
export function matchingAlerts(
  deal: { merchantId: string; category: string | null; discountPercent: number | null },
  db: Db = getDb(),
): DealAlert[] {
  return db
    .prepare<unknown[], AlertRow>(
      `SELECT * FROM deal_alerts
        WHERE status != 'UNSUBSCRIBED'
          AND (merchant_id IS NULL OR merchant_id = ?)
          AND (category IS NULL OR category = ?)
          AND (min_discount IS NULL OR (? IS NOT NULL AND ? >= min_discount))`,
    )
    .all(deal.merchantId, deal.category, deal.discountPercent, deal.discountPercent)
    .map(mapAlert);
}
