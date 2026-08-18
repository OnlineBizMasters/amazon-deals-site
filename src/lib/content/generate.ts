import { effectiveDiscountPercent } from "../services/deal-score";
import { contentWarnings, scoreVideoPotential } from "../services/video-score";
import { discountLabel, formatDate, formatMoney } from "../utils/format";
import { absoluteUrl } from "../site";
import { slugify } from "../utils/slug";
import type { Deal, Merchant } from "../domain/types";

/**
 * Social content generator.
 *
 * Templates are assembled **only** from fields stored on the deal and merchant.
 * There is no model call and no invention: if a price, discount, code or expiry
 * is missing, the corresponding line is omitted rather than filled in. Every
 * fact used is listed back to the admin in `facts` so output can be checked
 * against the record.
 */

export type ContentPlatform = "YOUTUBE" | "YOUTUBE_SHORTS" | "TIKTOK" | "FACEBOOK_REELS";

export interface ContentSection {
  key: string;
  label: string;
  kind: "text" | "list";
  value: string | string[];
  /** Optional guidance shown under the section in the admin UI. */
  hint?: string;
}

export interface ContentPack {
  platform: ContentPlatform;
  label: string;
  /** Tracked link for this platform, so click analytics can attribute traffic. */
  trackedUrl: string;
  sections: ContentSection[];
}

export interface ContentFact {
  label: string;
  value: string;
}

export interface GeneratedContent {
  packs: ContentPack[];
  facts: ContentFact[];
  warnings: string[];
  /** Fields that would unlock stronger content if they were filled in. */
  missingData: string[];
  contentPotentialScore: number;
}

interface DealFacts {
  merchantName: string;
  title: string;
  category: string | null;
  description: string | null;
  discountText: string | null;
  discountPercent: number | null;
  salePriceText: string | null;
  originalPriceText: string | null;
  couponCode: string | null;
  isCodeDeal: boolean;
  expiryText: string | null;
  verifiedText: string | null;
  dealUrl: string;
  merchantUrl: string;
}

function collectFacts(
  deal: Pick<
    Deal,
    | "title"
    | "slug"
    | "description"
    | "type"
    | "couponCode"
    | "discountPercent"
    | "discountAmount"
    | "originalPrice"
    | "salePrice"
    | "currency"
    | "expiresAt"
    | "verified"
    | "lastVerifiedAt"
    | "category"
  >,
  merchant: Pick<Merchant, "name" | "slug" | "category">,
): DealFacts {
  const percent = effectiveDiscountPercent(deal);

  return {
    merchantName: merchant.name,
    title: deal.title,
    category: deal.category ?? merchant.category ?? null,
    description: deal.description,
    discountText: discountLabel(deal),
    discountPercent: percent === null ? null : Math.round(percent),
    salePriceText: formatMoney(deal.salePrice, deal.currency),
    originalPriceText: formatMoney(deal.originalPrice, deal.currency),
    couponCode: deal.couponCode,
    isCodeDeal: deal.type === "PROMO_CODE",
    expiryText: formatDate(deal.expiresAt),
    verifiedText: deal.verified
      ? `Verified${deal.lastVerifiedAt ? ` on ${formatDate(deal.lastVerifiedAt)}` : ""}`
      : null,
    dealUrl: absoluteUrl(`/deal/${deal.slug}`),
    merchantUrl: absoluteUrl(`/coupons/${merchant.slug}`),
  };
}

/** Drops empty entries so no template ever renders a blank or placeholder line. */
function compact(lines: (string | null | undefined | false)[]): string[] {
  return lines.filter((line): line is string => Boolean(line && line.trim()));
}

function hashtagFor(value: string): string | null {
  const cleaned = value
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join("");
  return cleaned ? `#${cleaned}` : null;
}

function hashtags(facts: DealFacts, platform: ContentPlatform): string[] {
  const tags = compact([
    hashtagFor(facts.merchantName),
    facts.category ? hashtagFor(facts.category) : null,
    facts.isCodeDeal ? "#promocode" : "#deals",
    "#coupons",
    facts.discountPercent !== null ? `#${facts.discountPercent}percentoff` : null,
    platform === "YOUTUBE_SHORTS" ? "#shorts" : null,
    platform === "TIKTOK" ? "#tiktokmademebuyit" : null,
    platform === "FACEBOOK_REELS" ? "#reels" : null,
    "#savemoney",
  ]);

  return [...new Set(tags)];
}

/** Keyword/tag suggestions built from the merchant, category and deal wording. */
function keywords(facts: DealFacts): string[] {
  const merchantLower = facts.merchantName.toLowerCase();
  return [
    ...new Set(
      compact([
        merchantLower,
        `${merchantLower} coupon`,
        `${merchantLower} promo code`,
        `${merchantLower} discount`,
        facts.isCodeDeal ? `${merchantLower} coupon code` : `${merchantLower} deal`,
        facts.category ? `${facts.category.toLowerCase()} deals` : null,
        facts.category ? `${facts.category.toLowerCase()} coupons` : null,
        facts.discountPercent !== null ? `${merchantLower} ${facts.discountPercent}% off` : null,
        "coupon codes",
        "online shopping deals",
      ]),
    ),
  ];
}

/** Fact bullets reused across long descriptions. */
function factLines(facts: DealFacts): string[] {
  return compact([
    `Store: ${facts.merchantName}`,
    `Offer: ${facts.title}`,
    facts.discountText ? `Discount recorded: ${facts.discountText}` : null,
    facts.salePriceText
      ? `Price recorded: ${facts.salePriceText}${
          facts.originalPriceText ? ` (was ${facts.originalPriceText})` : ""
        }`
      : null,
    facts.isCodeDeal && facts.couponCode ? `Code: ${facts.couponCode}` : null,
    facts.category ? `Category: ${facts.category}` : null,
    facts.expiryText ? `Listed expiry: ${facts.expiryText}` : null,
    facts.verifiedText,
  ]);
}

const DISCLOSURE =
  "Affiliate disclosure: links in this description are affiliate links. If you buy through them we may earn a commission at no extra cost to you. Prices, availability and codes are set by the store and can change at any time.";

function titleIdeas(facts: DealFacts): string[] {
  const ideas = compact([
    facts.discountPercent !== null
      ? `${facts.merchantName} ${facts.discountPercent}% Off — ${facts.isCodeDeal ? "Code Inside" : "Deal Details"}`
      : null,
    facts.isCodeDeal && facts.couponCode
      ? `${facts.merchantName} Promo Code ${facts.couponCode} — How To Use It`
      : null,
    `${facts.merchantName} Deal: ${facts.title}`,
    facts.discountText
      ? `How I Got ${facts.discountText} At ${facts.merchantName}`
      : `What The Current ${facts.merchantName} Offer Actually Includes`,
    facts.expiryText
      ? `${facts.merchantName} Offer Listed Until ${facts.expiryText}`
      : `${facts.merchantName} Offer Walkthrough`,
  ]);

  return ideas.map((idea) => (idea.length > 100 ? `${idea.slice(0, 97)}...` : idea));
}

function thumbnailIdeas(facts: DealFacts): string[] {
  return compact([
    facts.discountPercent !== null ? `${facts.discountPercent}% OFF` : null,
    facts.discountPercent === null && facts.discountText ? facts.discountText.toUpperCase() : null,
    facts.isCodeDeal && facts.couponCode ? `CODE: ${facts.couponCode}` : null,
    facts.merchantName.toUpperCase(),
    facts.salePriceText ? `NOW ${facts.salePriceText}` : null,
    facts.expiryText ? `LISTED UNTIL ${facts.expiryText.toUpperCase()}` : null,
  ]);
}

function hook(facts: DealFacts): string {
  if (facts.discountText && facts.isCodeDeal && facts.couponCode) {
    return `${facts.merchantName} has a code for ${facts.discountText} right now — here it is.`;
  }
  if (facts.discountText) {
    return `${facts.merchantName} is showing ${facts.discountText} on this one.`;
  }
  if (facts.isCodeDeal && facts.couponCode) {
    return `There is a live ${facts.merchantName} code you can use at checkout.`;
  }
  return `Here is the current ${facts.merchantName} offer, in plain terms.`;
}

function callToAction(facts: DealFacts, platform: ContentPlatform, trackedUrl: string): string {
  const where = platform === "YOUTUBE" ? "in the description" : "in the link";
  return compact([
    `Full details and the tracked link are ${where}: ${trackedUrl}`,
    `All ${facts.merchantName} offers we list: ${facts.merchantUrl}`,
  ]).join("\n");
}

function shortsScript(facts: DealFacts, trackedUrl: string): string[] {
  return compact([
    `0:00-0:03 — Hook: "${hook(facts)}"`,
    facts.isCodeDeal && facts.couponCode
      ? `0:03-0:10 — Show the code on screen: ${facts.couponCode}. Say it once, clearly.`
      : `0:03-0:10 — Show the offer: ${facts.title}.`,
    facts.salePriceText
      ? `0:10-0:16 — Show the recorded price: ${facts.salePriceText}${
          facts.originalPriceText ? ` down from ${facts.originalPriceText}` : ""
        }. Say the price came from the listing, not a guarantee.`
      : facts.discountText
        ? `0:10-0:16 — State the recorded discount: ${facts.discountText}.`
        : null,
    facts.expiryText
      ? `0:16-0:22 — Mention the listed expiry: ${facts.expiryText}. Do not add a countdown the store has not stated.`
      : `0:16-0:22 — Note that the store can change or end the offer at any time.`,
    `0:22-0:28 — CTA: "Link is in the bio/description." (${trackedUrl})`,
    "0:28-0:30 — Say the link is an affiliate link.",
  ]);
}

export function generateContent(
  deal: Pick<
    Deal,
    | "id"
    | "title"
    | "slug"
    | "description"
    | "type"
    | "couponCode"
    | "discountPercent"
    | "discountAmount"
    | "originalPrice"
    | "salePrice"
    | "currency"
    | "expiresAt"
    | "startDate"
    | "verified"
    | "lastVerifiedAt"
    | "category"
    | "createdAt"
    | "clickCount"
    | "workedYes"
    | "workedNo"
  >,
  merchant: Pick<Merchant, "name" | "slug" | "category" | "qualityScore">,
  options: { maxClickCount?: number; now?: Date } = {},
): GeneratedContent {
  const facts = collectFacts(deal, merchant);
  const potential = scoreVideoPotential({
    deal,
    merchant,
    maxClickCount: options.maxClickCount,
    now: options.now,
  });

  const trackedUrl = (src: string) => absoluteUrl(`/go/${deal.id}?src=${src}`);

  const youtube: ContentPack = {
    platform: "YOUTUBE",
    label: "YouTube (long form)",
    trackedUrl: trackedUrl("youtube"),
    sections: [
      {
        key: "titles",
        label: "Video title ideas",
        kind: "list",
        value: titleIdeas(facts),
        hint: "Built from stored fields only. Re-check any discount in the title before publishing.",
      },
      {
        key: "description",
        label: "Long description",
        kind: "text",
        value: compact([
          hook(facts),
          "",
          "What is stored for this offer:",
          ...factLines(facts).map((line) => `• ${line}`),
          facts.description ? "" : null,
          facts.description ? `Store description: ${facts.description}` : null,
          "",
          callToAction(facts, "YOUTUBE", trackedUrl("youtube")),
          "",
          DISCLOSURE,
        ]).join("\n"),
      },
      {
        key: "cta",
        label: "Spoken CTA",
        kind: "text",
        value: compact([
          facts.isCodeDeal && facts.couponCode
            ? `Copy the code ${facts.couponCode} from the description, then use the link to open ${facts.merchantName}.`
            : `Use the link in the description to open the ${facts.merchantName} offer.`,
          "The link is an affiliate link, and the store sets the final price.",
        ]).join(" "),
      },
      { key: "hashtags", label: "Hashtag suggestions", kind: "list", value: hashtags(facts, "YOUTUBE") },
      {
        key: "keywords",
        label: "Tag / keyword suggestions",
        kind: "list",
        value: keywords(facts),
      },
      {
        key: "thumbnail",
        label: "Thumbnail text ideas",
        kind: "list",
        value: thumbnailIdeas(facts),
        hint: "Discount and price text on a thumbnail goes stale when the offer changes.",
      },
    ],
  };

  const shorts: ContentPack = {
    platform: "YOUTUBE_SHORTS",
    label: "YouTube Shorts",
    trackedUrl: trackedUrl("youtube_shorts"),
    sections: [
      { key: "hook", label: "Hook (first 3 seconds)", kind: "text", value: hook(facts) },
      {
        key: "script",
        label: "15-30 second script",
        kind: "list",
        value: shortsScript(facts, trackedUrl("youtube_shorts")),
      },
      {
        key: "caption",
        label: "Caption",
        kind: "text",
        value: compact([
          facts.discountText
            ? `${facts.merchantName} — ${facts.discountText}.`
            : `${facts.merchantName} — ${facts.title}.`,
          facts.isCodeDeal && facts.couponCode ? `Code: ${facts.couponCode}.` : null,
          facts.expiryText ? `Listed until ${facts.expiryText}.` : null,
          "Affiliate link in description.",
        ]).join(" "),
      },
      { key: "hashtags", label: "Hashtags", kind: "list", value: hashtags(facts, "YOUTUBE_SHORTS") },
    ],
  };

  const tiktok: ContentPack = {
    platform: "TIKTOK",
    label: "TikTok",
    trackedUrl: trackedUrl("tiktok"),
    sections: [
      { key: "hook", label: "Hook", kind: "text", value: hook(facts) },
      {
        key: "caption",
        label: "Caption",
        kind: "text",
        value: compact([
          facts.discountText
            ? `${facts.merchantName} ${facts.discountText}`
            : `${facts.merchantName}: ${facts.title}`,
          facts.isCodeDeal && facts.couponCode ? `code ${facts.couponCode}` : null,
          "link in bio (affiliate)",
        ]).join(" · "),
      },
      {
        key: "description",
        label: "Longer SEO-friendly description",
        kind: "text",
        value: compact([
          `${facts.merchantName} ${facts.isCodeDeal ? "promo code" : "deal"}${
            facts.discountText ? ` — ${facts.discountText}` : ""
          }.`,
          ...factLines(facts).map((line) => `• ${line}`),
          facts.category ? `Looking for more ${facts.category.toLowerCase()} offers? ${facts.merchantUrl}` : null,
          "Affiliate link — the store sets the final price and can change or end the offer.",
        ]).join("\n"),
      },
      { key: "hashtags", label: "Hashtags", kind: "list", value: hashtags(facts, "TIKTOK") },
      {
        key: "cover",
        label: "Cover / thumbnail text",
        kind: "list",
        value: thumbnailIdeas(facts),
        hint: "Avoid burning a discount into the cover if the offer has a near-term expiry.",
      },
    ],
  };

  const reels: ContentPack = {
    platform: "FACEBOOK_REELS",
    label: "Facebook Reels",
    trackedUrl: trackedUrl("facebook"),
    sections: [
      {
        key: "title",
        label: "Title",
        kind: "text",
        value:
          facts.discountText
            ? `${facts.merchantName}: ${facts.discountText}`
            : `${facts.merchantName}: ${facts.title}`,
      },
      {
        key: "caption",
        label: "Caption",
        kind: "text",
        value: compact([
          hook(facts),
          facts.isCodeDeal && facts.couponCode ? `Code: ${facts.couponCode}.` : null,
          facts.salePriceText ? `Listed price: ${facts.salePriceText}.` : null,
          facts.expiryText ? `Listed expiry: ${facts.expiryText}.` : null,
          `Details: ${trackedUrl("facebook")}`,
        ]).join(" "),
      },
      {
        key: "cta",
        label: "CTA",
        kind: "text",
        value: callToAction(facts, "FACEBOOK_REELS", trackedUrl("facebook")),
      },
      { key: "hashtags", label: "Hashtags", kind: "list", value: hashtags(facts, "FACEBOOK_REELS") },
      { key: "cover", label: "Cover text", kind: "list", value: thumbnailIdeas(facts) },
    ],
  };

  const factList: ContentFact[] = compact([
    `Merchant|${facts.merchantName}`,
    `Deal title|${facts.title}`,
    facts.discountText ? `Discount|${facts.discountText}` : null,
    facts.salePriceText ? `Sale price|${facts.salePriceText}` : null,
    facts.originalPriceText ? `Original price|${facts.originalPriceText}` : null,
    facts.couponCode ? `Coupon code|${facts.couponCode}` : null,
    facts.expiryText ? `Expires|${facts.expiryText}` : null,
    facts.category ? `Category|${facts.category}` : null,
    facts.verifiedText ? `Verification|${facts.verifiedText}` : "Verification|Not marked verified",
  ]).map((entry) => {
    const [label, value] = entry.split("|");
    return { label, value };
  });

  return {
    packs: [youtube, shorts, tiktok, reels],
    facts: factList,
    warnings: contentWarnings({ deal, merchant, now: options.now }),
    missingData: potential.missingData,
    contentPotentialScore: potential.score,
  };
}

/** Filename-safe stem for exporting a content pack. */
export function contentExportName(merchantName: string, dealTitle: string): string {
  return `${slugify(merchantName)}-${slugify(dealTitle)}`.slice(0, 90) || "dealscout-content";
}
