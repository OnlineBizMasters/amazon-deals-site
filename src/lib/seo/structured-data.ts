import { absoluteUrl, SITE } from "../site";
import type { Merchant } from "../domain/types";
import type { ScoredDeal } from "../db/mappers";

/**
 * JSON-LD builders.
 *
 * Only fields backed by stored data are emitted: no invented ratings, review
 * counts, availability or prices. Anything missing is omitted so the markup stays
 * valid and truthful.
 */

type Json = Record<string, unknown>;

export function breadcrumbList(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Schema.org Offer for a single deal. Price fields appear only when stored. */
export function offerSchema(deal: ScoredDeal): Json {
  const offer: Json = {
    "@type": "Offer",
    name: deal.title,
    url: absoluteUrl(`/deal/${deal.slug}`),
    seller: {
      "@type": "Organization",
      name: deal.merchant.name,
      ...(deal.merchant.websiteUrl ? { url: deal.merchant.websiteUrl } : {}),
    },
  };

  if (deal.description) offer.description = deal.description;
  if (typeof deal.salePrice === "number") {
    offer.price = deal.salePrice;
    offer.priceCurrency = deal.currency;
  }
  if (deal.expiresAt) offer.availabilityEnds = deal.expiresAt;
  if (deal.startDate) offer.availabilityStarts = deal.startDate;
  if (deal.couponCode) offer.discountCode = deal.couponCode;

  return offer;
}

export function merchantPageSchema(merchant: Merchant, deals: ScoredDeal[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${merchant.name} coupons and deals`,
    url: absoluteUrl(`/coupons/${merchant.slug}`),
    about: {
      "@type": "Organization",
      name: merchant.name,
      ...(merchant.websiteUrl ? { url: merchant.websiteUrl } : {}),
      ...(merchant.logo ? { logo: merchant.logo } : {}),
      ...(merchant.description ? { description: merchant.description } : {}),
    },
    ...(deals.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: deals.length,
            itemListElement: deals.map((deal, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: offerSchema(deal),
            })),
          },
        }
      : {}),
  };
}

export function dealPageSchema(deal: ScoredDeal): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemPage",
    name: deal.title,
    url: absoluteUrl(`/deal/${deal.slug}`),
    datePublished: deal.createdAt,
    dateModified: deal.updatedAt,
    mainEntity: offerSchema(deal),
    publisher: { "@type": "Organization", name: SITE.name, url: absoluteUrl("/") },
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl("/"),
    description: SITE.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
