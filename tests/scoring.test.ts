import { describe, expect, it } from "vitest";
import {
  effectiveDiscountPercent,
  qualifiesAsTrending,
  scoreDeal,
  SIGNALS,
} from "@/lib/services/deal-score";
import { contentDataCompleteness, scoreVideoPotential } from "@/lib/services/video-score";
import { feedbackSignal, verificationFreshness, automatedVerificationAvailable } from "@/lib/services/verification";
import type { Deal, Merchant } from "@/lib/domain/types";

const NOW = new Date("2026-06-15T12:00:00Z");

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "d1",
    merchantId: "m1",
    title: "20% off full-price styles",
    slug: "nike-20-off",
    description: "A reasonably detailed description of the offer for testing purposes.",
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
    verified: false,
    lastVerifiedAt: null,
    status: "ACTIVE",
    source: "MANUAL",
    sourceExternalId: null,
    featured: false,
    trending: false,
    clickCount: 0,
    workedYes: 0,
    workedNo: 0,
    category: "Fashion",
    terms: null,
    isDemo: false,
    createdAt: new Date(NOW.getTime() - 2 * 86_400_000).toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

const merchant: Pick<Merchant, "qualityScore" | "featured" | "name" | "slug" | "category"> = {
  qualityScore: 70,
  featured: false,
  name: "Nike",
  slug: "nike",
  category: "Fashion",
};

describe("effectiveDiscountPercent", () => {
  it("prefers the stored percentage", () => {
    expect(
      effectiveDiscountPercent({ discountPercent: 25, originalPrice: 100, salePrice: 90 }),
    ).toBe(25);
  });

  it("derives one from prices when absent", () => {
    expect(effectiveDiscountPercent({ discountPercent: null, originalPrice: 200, salePrice: 150 })).toBe(
      25,
    );
  });

  it("returns null when there is nothing to work from", () => {
    expect(
      effectiveDiscountPercent({ discountPercent: null, originalPrice: null, salePrice: null }),
    ).toBeNull();
  });
});

describe("scoreDeal", () => {
  it("returns a score between 0 and 100", () => {
    const result = scoreDeal({ deal: deal(), merchant, now: NOW });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("rewards a bigger stored discount", () => {
    const small = scoreDeal({ deal: deal({ discountPercent: 5 }), merchant, now: NOW }).score;
    const large = scoreDeal({ deal: deal({ discountPercent: 60 }), merchant, now: NOW }).score;

    expect(large).toBeGreaterThan(small);
  });

  it("rewards recent verification over none", () => {
    const unverified = scoreDeal({ deal: deal(), merchant, now: NOW }).score;
    const verified = scoreDeal({
      deal: deal({ verified: true, lastVerifiedAt: NOW.toISOString() }),
      merchant,
      now: NOW,
    }).score;

    expect(verified).toBeGreaterThan(unverified);
  });

  it("values a fresh verification above a stale one", () => {
    const fresh = scoreDeal({
      deal: deal({ verified: true, lastVerifiedAt: NOW.toISOString() }),
      merchant,
      now: NOW,
    }).score;
    const stale = scoreDeal({
      deal: deal({
        verified: true,
        lastVerifiedAt: new Date(NOW.getTime() - 200 * 86_400_000).toISOString(),
      }),
      merchant,
      now: NOW,
    }).score;

    expect(fresh).toBeGreaterThan(stale);
  });

  it("penalises newer records less than old ones", () => {
    const fresh = scoreDeal({ deal: deal({ createdAt: NOW.toISOString() }), merchant, now: NOW }).score;
    const old = scoreDeal({
      deal: deal({ createdAt: new Date(NOW.getTime() - 200 * 86_400_000).toISOString() }),
      merchant,
      now: NOW,
    }).score;

    expect(fresh).toBeGreaterThan(old);
  });

  it("excludes signals with no data instead of scoring them zero", () => {
    const sparse = scoreDeal({
      deal: deal({ discountPercent: null, clickCount: 0, expiresAt: null }),
      merchant,
      now: NOW,
    });

    const engagement = sparse.breakdown.find((entry) => entry.key === "engagement");
    expect(engagement?.value).toBeNull();
    expect(engagement?.points).toBe(0);
    expect(sparse.dataCoverage).toBeLessThan(1);
    expect(sparse.score).toBeGreaterThan(0);
  });

  it("reports full coverage when every signal has data", () => {
    const complete = scoreDeal({
      deal: deal({
        verified: true,
        lastVerifiedAt: NOW.toISOString(),
        expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
        clickCount: 100,
        workedYes: 10,
        workedNo: 1,
        featured: true,
        trending: true,
      }),
      merchant,
      maxClickCount: 200,
      now: NOW,
    });

    expect(complete.dataCoverage).toBe(1);
  });

  it("weights sum to 100 so the breakdown is readable", () => {
    expect(SIGNALS.reduce((sum, signal) => sum + signal.weight, 0)).toBe(100);
  });

  it("lets negative feedback lower the score", () => {
    const positive = scoreDeal({
      deal: deal({ workedYes: 20, workedNo: 0, clickCount: 50 }),
      merchant,
      maxClickCount: 50,
      now: NOW,
    }).score;
    const negative = scoreDeal({
      deal: deal({ workedYes: 0, workedNo: 20, clickCount: 50 }),
      merchant,
      maxClickCount: 50,
      now: NOW,
    }).score;

    expect(positive).toBeGreaterThan(negative);
  });
});

describe("qualifiesAsTrending", () => {
  it("honours an administrator flag", () => {
    expect(
      qualifiesAsTrending({ trending: true, clickCount: 0, workedYes: 0, workedNo: 0, status: "ACTIVE" }),
    ).toBe(true);
  });

  it("requires real click volume when the flag is not set", () => {
    expect(
      qualifiesAsTrending({ trending: false, clickCount: 3, workedYes: 0, workedNo: 0, status: "ACTIVE" }),
    ).toBe(false);
    expect(
      qualifiesAsTrending({ trending: false, clickCount: 80, workedYes: 5, workedNo: 1, status: "ACTIVE" }),
    ).toBe(true);
  });

  it("never labels an inactive deal as trending", () => {
    expect(
      qualifiesAsTrending({
        trending: true,
        clickCount: 500,
        workedYes: 50,
        workedNo: 0,
        status: "EXPIRED",
      }),
    ).toBe(false);
  });

  it("does not trend when feedback is mostly negative", () => {
    expect(
      qualifiesAsTrending({
        trending: false,
        clickCount: 200,
        workedYes: 1,
        workedNo: 20,
        status: "ACTIVE",
      }),
    ).toBe(false);
  });
});

describe("scoreVideoPotential", () => {
  it("scores a rich, urgent, well-clicked offer highly", () => {
    const result = scoreVideoPotential({
      deal: deal({
        discountPercent: 60,
        salePrice: 49.99,
        originalPrice: 129.99,
        expiresAt: new Date(NOW.getTime() + 86_400_000).toISOString(),
        clickCount: 300,
        workedYes: 30,
        verified: true,
      }),
      merchant,
      maxClickCount: 300,
      now: NOW,
    });

    expect(result.score).toBeGreaterThan(70);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("scores a bare record low and lists what is missing", () => {
    const result = scoreVideoPotential({
      deal: deal({
        title: "Sale",
        description: null,
        discountPercent: null,
        salePrice: null,
        originalPrice: null,
        category: null,
        couponCode: null,
        clickCount: 0,
      }),
      merchant,
      now: NOW,
    });

    expect(result.score).toBeLessThan(40);
    expect(result.missingData).toEqual(
      expect.arrayContaining(["descriptive title", "description", "discount value"]),
    );
  });

  it("measures data completeness from stored fields only", () => {
    const complete = contentDataCompleteness({
      deal: deal({ salePrice: 20, originalPrice: 40 }),
      merchant,
      now: NOW,
    });

    expect(complete.value).toBe(1);
    expect(complete.missing).toEqual([]);
  });
});

describe("verification", () => {
  it("ships no automated verifier", () => {
    expect(automatedVerificationAvailable()).toBe(false);
  });

  it("describes verification freshness from the stored date", () => {
    expect(verificationFreshness(deal(), NOW)).toBe("unverified");
    expect(
      verificationFreshness(deal({ verified: true, lastVerifiedAt: NOW.toISOString() }), NOW),
    ).toBe("fresh");
    expect(
      verificationFreshness(
        deal({ verified: true, lastVerifiedAt: new Date(NOW.getTime() - 30 * 86_400_000).toISOString() }),
        NOW,
      ),
    ).toBe("stale");
  });

  it("summarises feedback into an admin recommendation", () => {
    expect(feedbackSignal({ workedYes: 0, workedNo: 0 })).toMatchObject({ recommendation: "no_data" });
    expect(feedbackSignal({ workedYes: 9, workedNo: 1 })).toMatchObject({
      recommendation: "looks_healthy",
    });
    expect(feedbackSignal({ workedYes: 1, workedNo: 9 })).toMatchObject({
      recommendation: "likely_broken",
    });
  });
});
