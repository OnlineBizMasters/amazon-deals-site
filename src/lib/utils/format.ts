/** Presentation helpers. All of them tolerate missing data by returning null. */

export function formatMoney(value: number | null | undefined, currency = "USD"): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function daysUntil(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export function daysSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

/**
 * Human wording for an expiry date. Returns null when no date is stored so the
 * UI can omit expiry messaging rather than inventing urgency.
 */
export function expiryLabel(iso: string | null | undefined, now = new Date()): string | null {
  const days = daysUntil(iso, now);
  if (days === null) return null;
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 30) return `Expires in ${days} days`;
  const formatted = formatDate(iso);
  return formatted ? `Expires ${formatted}` : null;
}

export function relativeTime(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return formatDate(iso);
}

/**
 * Short badge text for a deal's saving. Prefers percent, then absolute amount,
 * then a price drop derived from stored prices. Null when nothing is stored.
 */
export function discountLabel(deal: {
  discountPercent: number | null;
  discountAmount: number | null;
  originalPrice: number | null;
  salePrice: number | null;
  currency: string;
}): string | null {
  if (typeof deal.discountPercent === "number" && deal.discountPercent > 0) {
    return `${Math.round(deal.discountPercent)}% off`;
  }
  if (typeof deal.discountAmount === "number" && deal.discountAmount > 0) {
    const money = formatMoney(deal.discountAmount, deal.currency);
    return money ? `${money} off` : null;
  }
  if (
    typeof deal.originalPrice === "number" &&
    typeof deal.salePrice === "number" &&
    deal.originalPrice > deal.salePrice
  ) {
    const money = formatMoney(deal.originalPrice - deal.salePrice, deal.currency);
    return money ? `${money} off` : null;
  }
  return null;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

export function initials(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
