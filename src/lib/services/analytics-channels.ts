import { TRAFFIC_CHANNELS, type TrafficChannel } from "../domain/types";

/**
 * Maps the `src` parameter on /go links (and, as a fallback, the referrer host)
 * onto a small set of comparable channels. Only these coarse buckets are stored
 * — no per-visitor identifiers.
 */

const SRC_PATTERNS: { channel: TrafficChannel; test: RegExp }[] = [
  { channel: "youtube", test: /(^|[^a-z])(yt|youtube|shorts)([^a-z]|$)/i },
  { channel: "tiktok", test: /tiktok|^tt$/i },
  { channel: "facebook", test: /facebook|^fb$|reels?/i },
  { channel: "instagram", test: /instagram|^ig$/i },
  { channel: "pinterest", test: /pinterest|^pin$/i },
  { channel: "email", test: /email|newsletter|mail/i },
];

const REFERRER_PATTERNS: { channel: TrafficChannel; test: RegExp }[] = [
  { channel: "youtube", test: /youtube\.com|youtu\.be/i },
  { channel: "tiktok", test: /tiktok\.com/i },
  { channel: "facebook", test: /facebook\.com|fb\.com|fb\.me/i },
  { channel: "instagram", test: /instagram\.com/i },
  { channel: "pinterest", test: /pinterest\./i },
  { channel: "seo_direct", test: /google\.|bing\.com|duckduckgo\.com|search\.yahoo\./i },
];

/** Keeps stored `src` values short and predictable. */
export function normalizeSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_.:-]/g, "").slice(0, 40);
  return cleaned || null;
}

export function classifyChannel(
  src: string | null | undefined,
  referrerHost?: string | null,
  sameHost?: boolean,
): TrafficChannel {
  const normalized = normalizeSrc(src);
  if (normalized) {
    for (const pattern of SRC_PATTERNS) {
      if (pattern.test.test(normalized)) return pattern.channel;
    }
    if (TRAFFIC_CHANNELS.includes(normalized as TrafficChannel)) {
      return normalized as TrafficChannel;
    }
    return "other";
  }

  if (referrerHost) {
    for (const pattern of REFERRER_PATTERNS) {
      if (pattern.test.test(referrerHost)) return pattern.channel;
    }
    // A referrer from our own site means the visitor arrived through search or
    // typed the address and then browsed internally.
    return sameHost ? "seo_direct" : "other";
  }

  return "seo_direct";
}

export const CHANNEL_LABELS: Record<TrafficChannel, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  facebook: "Facebook",
  instagram: "Instagram",
  pinterest: "Pinterest",
  email: "Email",
  seo_direct: "SEO / Direct",
  other: "Other",
};
