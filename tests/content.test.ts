import { describe, expect, it } from "vitest";
import { generateContent } from "@/lib/content/generate";
import { contentWarnings } from "@/lib/services/video-score";
import type { Deal, Merchant } from "@/lib/domain/types";

const NOW = new Date("2026-06-15T12:00:00Z");

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-123",
    merchantId: "m1",
    title: "20% off full-price styles",
    slug: "nike-20-off-full-price-styles",
    description: "Members get 20% off full-price styles with a code at checkout.",
    type: "PROMO_CODE",
    couponCode: "SAVE20",
    destinationUrl: "https://nike.com/sale",
    affiliateUrl: null,
    originalPrice: null,
    salePrice: null,
    discountPercent: 20,
    discountAmount: null,
    currency: "USD",
    startDate: null,
    expiresAt: null,
    verified: true,
    lastVerifiedAt: new Date(NOW.getTime() - 86_400_000).toISOString(),
    status: "ACTIVE",
    source: "MANUAL",
    sourceExternalId: null,
    featured: false,
    trending: false,
    clickCount: 12,
    workedYes: 3,
    workedNo: 0,
    category: "Fashion",
    terms: null,
    isDemo: false,
    createdAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

const merchant: Pick<Merchant, "name" | "slug" | "category" | "qualityScore"> = {
  name: "Nike",
  slug: "nike",
  category: "Fashion",
  qualityScore: 80,
};

function allText(content: ReturnType<typeof generateContent>): string {
  return content.packs
    .flatMap((pack) =>
      pack.sections.map((section) =>
        Array.isArray(section.value) ? section.value.join("\n") : section.value,
      ),
    )
    .join("\n");
}

describe("generateContent", () => {
  it("produces a pack for each required platform", () => {
    const content = generateContent(deal(), merchant, { now: NOW });

    expect(content.packs.map((pack) => pack.platform)).toEqual([
      "YOUTUBE",
      "YOUTUBE_SHORTS",
      "TIKTOK",
      "FACEBOOK_REELS",
    ]);
  });

  it("includes every section the brief asks for on YouTube", () => {
    const content = generateContent(deal(), merchant, { now: NOW });
    const youtube = content.packs.find((pack) => pack.platform === "YOUTUBE")!;

    expect(youtube.sections.map((section) => section.key)).toEqual([
      "titles",
      "description",
      "cta",
      "hashtags",
      "keywords",
      "thumbnail",
    ]);
  });

  it("covers hook, script, caption and hashtags for Shorts", () => {
    const content = generateContent(deal(), merchant, { now: NOW });
    const shorts = content.packs.find((pack) => pack.platform === "YOUTUBE_SHORTS")!;

    expect(shorts.sections.map((section) => section.key)).toEqual([
      "hook",
      "script",
      "caption",
      "hashtags",
    ]);
  });

  it("uses only stored values — merchant, code and discount appear verbatim", () => {
    const text = allText(generateContent(deal(), merchant, { now: NOW }));

    expect(text).toContain("Nike");
    expect(text).toContain("SAVE20");
    expect(text).toContain("20% off");
  });

  it("omits price lines entirely when no price is stored", () => {
    const text = allText(generateContent(deal(), merchant, { now: NOW }));

    expect(text).not.toMatch(/Price recorded/);
    expect(text).not.toMatch(/\$\d/);
  });

  it("includes the price only when one is stored", () => {
    const text = allText(
      generateContent(deal({ salePrice: 59.99, originalPrice: 119.99 }), merchant, { now: NOW }),
    );

    expect(text).toContain("$59.99");
    expect(text).toContain("$119.99");
  });

  it("never mentions an expiry when none is stored", () => {
    const text = allText(generateContent(deal({ expiresAt: null }), merchant, { now: NOW }));

    expect(text).not.toMatch(/Listed expiry/);
    expect(text).not.toMatch(/Listed until/);
  });

  it("mentions the expiry when one is stored", () => {
    const text = allText(
      generateContent(deal({ expiresAt: "2026-06-20T23:59:59.000Z" }), merchant, { now: NOW }),
    );

    expect(text).toContain("Jun 20, 2026");
  });

  it("never invents ratings, review counts or stock claims", () => {
    const text = allText(generateContent(deal(), merchant, { now: NOW })).toLowerCase();

    expect(text).not.toMatch(/\d+(\.\d+)?\s*(stars?|\/5)/);
    expect(text).not.toMatch(/reviews?\b/);
    expect(text).not.toMatch(/only \d+ left/);
    expect(text).not.toMatch(/\d+ people bought/);
    expect(text).not.toMatch(/best.?sell/);
  });

  it("does not promise a code for a codeless deal", () => {
    const text = allText(
      generateContent(deal({ type: "DEAL", couponCode: null }), merchant, { now: NOW }),
    );

    expect(text).not.toContain("SAVE20");
    expect(text).not.toMatch(/Code:/);
  });

  it("includes a per-platform tracked link carrying the campaign tag", () => {
    const content = generateContent(deal(), merchant, { now: NOW });

    expect(content.packs[0].trackedUrl).toContain("/go/deal-123?src=youtube");
    expect(content.packs.find((pack) => pack.platform === "TIKTOK")?.trackedUrl).toContain("src=tiktok");
    expect(content.packs.find((pack) => pack.platform === "FACEBOOK_REELS")?.trackedUrl).toContain(
      "src=facebook",
    );
  });

  it("includes an affiliate disclosure in the long description", () => {
    const description = generateContent(deal(), merchant, { now: NOW })
      .packs[0].sections.find((section) => section.key === "description")!.value as string;

    expect(description).toContain("Affiliate disclosure");
  });

  it("reports the facts it used back to the admin", () => {
    const content = generateContent(deal(), merchant, { now: NOW });
    const labels = content.facts.map((fact) => fact.label);

    expect(labels).toEqual(expect.arrayContaining(["Merchant", "Deal title", "Discount", "Coupon code"]));
  });

  it("says verification is absent rather than implying it", () => {
    const content = generateContent(deal({ verified: false, lastVerifiedAt: null }), merchant, {
      now: NOW,
    });

    expect(content.facts).toEqual(
      expect.arrayContaining([{ label: "Verification", value: "Not marked verified" }]),
    );
  });
});

describe("contentWarnings", () => {
  it("warns that discount titles go stale when an expiry exists", () => {
    const warnings = contentWarnings({
      deal: deal({ expiresAt: "2026-06-18T23:59:59.000Z" }),
      merchant,
      now: NOW,
    });

    expect(warnings.some((warning) => warning.includes("become inaccurate"))).toBe(true);
    expect(warnings.some((warning) => warning.includes("day(s) left"))).toBe(true);
  });

  it("still warns about price changes when no expiry is stored", () => {
    const warnings = contentWarnings({ deal: deal({ expiresAt: null }), merchant, now: NOW });

    expect(warnings.some((warning) => warning.includes("merchant changes the price"))).toBe(true);
  });

  it("warns when a deal is not verified", () => {
    const warnings = contentWarnings({ deal: deal({ verified: false }), merchant, now: NOW });

    expect(warnings.some((warning) => warning.includes("not marked verified"))).toBe(true);
  });

  it("warns when a promo-code deal has no code", () => {
    const warnings = contentWarnings({
      deal: deal({ type: "PROMO_CODE", couponCode: null }),
      merchant,
      now: NOW,
    });

    expect(warnings.some((warning) => warning.includes("do not promise a code"))).toBe(true);
  });

  it("warns when feedback skews negative", () => {
    const warnings = contentWarnings({
      deal: deal({ workedYes: 1, workedNo: 8 }),
      merchant,
      now: NOW,
    });

    expect(warnings.some((warning) => warning.includes("feedback skews negative"))).toBe(true);
  });
});
