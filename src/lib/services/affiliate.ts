import { normalizeUrl, parseHttpUrl } from "../utils/url";
import type { Deal, Merchant } from "../domain/types";

/**
 * Resolves the outbound URL for a deal.
 *
 * Order of preference:
 *   1. the deal's own `affiliateUrl` (what a network feed supplies),
 *   2. a merchant-level `affiliateBaseUrl` deep-link template,
 *   3. an Amazon Associates tag applied to an Amazon destination,
 *   4. the plain `destinationUrl`.
 *
 * No affiliate credential is ever inlined in source: tags come from environment
 * variables, and a missing tag simply means the raw destination is used.
 */

export interface ResolvedOutbound {
  url: string;
  /** Which rule produced the URL — surfaced in the admin UI for transparency. */
  strategy: "deal_affiliate_url" | "merchant_template" | "amazon_tag" | "destination_url";
  /** True when the link carries affiliate attribution of some kind. */
  monetized: boolean;
}

const AMAZON_HOST = /(^|\.)amazon\.[a-z.]+$/i;

function applyAmazonTag(destination: string): string | null {
  const tag = process.env.AMAZON_ASSOCIATES_TAG?.trim() || process.env.AMAZON_AFFILIATE_TAG?.trim();
  if (!tag) return null;

  const url = parseHttpUrl(destination);
  if (!url || !AMAZON_HOST.test(url.hostname)) return null;

  url.searchParams.set("tag", tag);
  return url.toString();
}

/**
 * Expands a merchant deep-link template. `{destination}` is replaced with the
 * URL-encoded destination; templates without the placeholder get it appended as
 * a `url` parameter, which is the shape most networks use.
 */
function applyMerchantTemplate(template: string, destination: string): string | null {
  const trimmed = template.trim();
  if (!trimmed) return null;

  if (trimmed.includes("{destination}")) {
    return trimmed.replace("{destination}", encodeURIComponent(destination));
  }

  const base = parseHttpUrl(trimmed);
  if (!base) return null;
  base.searchParams.set("url", destination);
  return base.toString();
}

export function resolveOutboundUrl(
  deal: Pick<Deal, "affiliateUrl" | "destinationUrl">,
  merchant?: Pick<Merchant, "affiliateBaseUrl"> | null,
): ResolvedOutbound {
  const destination = normalizeUrl(deal.destinationUrl) ?? deal.destinationUrl;

  const dealAffiliate = normalizeUrl(deal.affiliateUrl);
  if (dealAffiliate) {
    return { url: dealAffiliate, strategy: "deal_affiliate_url", monetized: true };
  }

  if (merchant?.affiliateBaseUrl) {
    const templated = applyMerchantTemplate(merchant.affiliateBaseUrl, destination);
    if (templated) {
      return { url: templated, strategy: "merchant_template", monetized: true };
    }
  }

  const amazon = applyAmazonTag(destination);
  if (amazon) {
    return { url: amazon, strategy: "amazon_tag", monetized: true };
  }

  return { url: destination, strategy: "destination_url", monetized: false };
}

/** Internal tracked link shown in the UI — the raw affiliate URL is never rendered. */
export function trackedLink(dealId: string, src?: string | null): string {
  const params = new URLSearchParams();
  if (src) params.set("src", src);
  const query = params.toString();
  return `/go/${dealId}${query ? `?${query}` : ""}`;
}
