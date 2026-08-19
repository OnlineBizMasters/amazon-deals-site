import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import {
  createDeal,
  countDeals,
  getDealById,
  getDealBySlug,
  listDeals,
  markDealVerified,
  relatedDeals,
  toggleDealFlag,
} from "@/lib/repos/deals";
import { createMerchant, ensureMerchant, findMerchantByName, listMerchants } from "@/lib/repos/merchants";
import { clicksByChannel, recordClick, sourcePerformance, totalClicks } from "@/lib/repos/clicks";
import { recordDealFeedback } from "@/lib/repos/feedback";
import { approveSubmission, createSubmission, listSubmissions, rejectSubmission } from "@/lib/repos/submissions";
import { alertDeliveryStatus, createAlert, matchingAlerts } from "@/lib/repos/alerts";
import { resolveOutboundUrl } from "@/lib/services/affiliate";
import { classifyChannel, normalizeSrc } from "@/lib/services/analytics-channels";

let db: Db;
let nikeId: string;

beforeEach(() => {
  db = createTestDb();
  nikeId = createMerchant({ name: "Nike", category: "Fashion", qualityScore: 80 }, db).id;
});

function makeDeal(overrides: Partial<Parameters<typeof createDeal>[0]> = {}) {
  return createDeal(
    {
      merchantId: nikeId,
      title: "20% off full-price styles",
      type: "PROMO_CODE",
      couponCode: "save20",
      destinationUrl: "https://nike.com/sale",
      discountPercent: 20,
      ...overrides,
    },
    db,
  );
}

describe("merchants", () => {
  it("generates a unique slug from the name", () => {
    expect(createMerchant({ name: "Best Buy" }, db).slug).toBe("best-buy");
    expect(createMerchant({ name: "Best Buy" }, db).slug).toBe("best-buy-2");
  });

  it("matches merchant names case- and whitespace-insensitively", () => {
    expect(findMerchantByName(" nike ", db)?.id).toBe(nikeId);
    expect(findMerchantByName("NIKE", db)?.id).toBe(nikeId);
    expect(findMerchantByName("Unknown Store", db)).toBeNull();
  });

  it("creates a merchant only when one does not already exist", () => {
    expect(ensureMerchant({ name: "Nike" }, db)).toMatchObject({ created: false });
    expect(ensureMerchant({ name: "Adobe" }, db)).toMatchObject({ created: true });
  });

  it("counts active deals and codes per merchant", () => {
    makeDeal();
    makeDeal({ title: "Sale section", type: "DEAL", couponCode: null, destinationUrl: "https://nike.com/x" });
    makeDeal({ title: "Old", destinationUrl: "https://nike.com/old", status: "EXPIRED", couponCode: "OLD" });

    const [merchant] = listMerchants({ withActiveDeals: true }, db);
    expect(merchant.activeDealCount).toBe(2);
    expect(merchant.activeCodeCount).toBe(1);
  });

  it("omits merchants without active deals when asked", () => {
    expect(listMerchants({ withActiveDeals: true }, db)).toHaveLength(0);
    makeDeal();
    expect(listMerchants({ withActiveDeals: true }, db)).toHaveLength(1);
  });
});

describe("deals", () => {
  it("normalises the coupon code and slug on create", () => {
    const deal = makeDeal();

    expect(deal.couponCode).toBe("SAVE20");
    expect(deal.slug).toBe("nike-20-off-full-price-styles");
    expect(getDealBySlug(deal.slug, db)?.id).toBe(deal.id);
  });

  it("inherits the merchant category when none is given", () => {
    expect(makeDeal().category).toBe("Fashion");
  });

  it("stores a computed Deal Score", () => {
    expect(makeDeal().score).toBeGreaterThan(0);
  });

  it("rejects a deal for a merchant that does not exist", () => {
    expect(() => makeDeal({ merchantId: "nope" })).toThrow(/does not exist/);
  });

  it("enforces one deal per source and external id", () => {
    makeDeal({ source: "CJ", sourceExternalId: "abc" });
    expect(() =>
      makeDeal({ source: "CJ", sourceExternalId: "abc", destinationUrl: "https://nike.com/2" }),
    ).toThrow();
  });

  it("filters by minimum discount using stored or derived percentages", () => {
    makeDeal({ discountPercent: 10, destinationUrl: "https://nike.com/a", couponCode: "A" });
    makeDeal({ discountPercent: 50, destinationUrl: "https://nike.com/b", couponCode: "B" });
    makeDeal({
      discountPercent: null,
      originalPrice: 100,
      salePrice: 40,
      destinationUrl: "https://nike.com/c",
      couponCode: "C",
    });
    makeDeal({ discountPercent: null, destinationUrl: "https://nike.com/d", couponCode: "D" });

    const results = listDeals({ minDiscount: 40 }, db);
    expect(results).toHaveLength(2);
    expect(results.every((deal) => (deal.discountPercent ?? 0) >= 40)).toBe(true);
  });

  it("searches titles, codes, categories and merchant names", () => {
    makeDeal({ title: "Running shoe clearance", couponCode: "RUNFAST" });

    expect(listDeals({ q: "running" }, db)).toHaveLength(1);
    expect(listDeals({ q: "RUNFAST" }, db)).toHaveLength(1);
    expect(listDeals({ q: "nike" }, db)).toHaveLength(1);
    expect(listDeals({ q: "fashion" }, db)).toHaveLength(1);
    expect(listDeals({ q: "sofa" }, db)).toHaveLength(0);
  });

  it("filters by type and verification", () => {
    makeDeal();
    const plain = makeDeal({
      title: "Sale section",
      type: "DEAL",
      couponCode: null,
      destinationUrl: "https://nike.com/sale-section",
    });
    markDealVerified(plain.id, true, db);

    expect(listDeals({ type: "PROMO_CODE" }, db)).toHaveLength(1);
    expect(listDeals({ type: "DEAL" }, db)).toHaveLength(1);
    expect(listDeals({ verifiedOnly: true }, db)).toHaveLength(1);
  });

  it("records a verification timestamp when marking verified", () => {
    const deal = markDealVerified(makeDeal().id, true, db);

    expect(deal?.verified).toBe(true);
    expect(deal?.lastVerifiedAt).not.toBeNull();

    const cleared = markDealVerified(deal!.id, false, db);
    expect(cleared?.verified).toBe(false);
    expect(cleared?.lastVerifiedAt).toBeNull();
  });

  it("toggles editorial flags", () => {
    const deal = makeDeal();

    expect(toggleDealFlag(deal.id, "trending", true, db)?.trending).toBe(true);
    expect(toggleDealFlag(deal.id, "featured", true, db)?.featured).toBe(true);
  });

  it("excludes non-active deals from the default listing", () => {
    makeDeal({ status: "PENDING" });
    makeDeal({ status: "DISABLED", destinationUrl: "https://nike.com/2", couponCode: "B" });

    expect(listDeals({}, db)).toHaveLength(0);
    expect(countDeals({ status: "ALL" }, db)).toBe(2);
  });

  it("prefers same-merchant offers for related deals, then the same category", () => {
    const target = makeDeal();
    makeDeal({ title: "Another Nike offer", destinationUrl: "https://nike.com/2", couponCode: "B" });

    const adobeId = createMerchant({ name: "Adobe", category: "Fashion" }, db).id;
    createDeal(
      {
        merchantId: adobeId,
        title: "Adobe fashion crossover",
        type: "DEAL",
        destinationUrl: "https://adobe.com/x",
        category: "Fashion",
      },
      db,
    );

    const related = relatedDeals(target, 5, db);
    expect(related).toHaveLength(2);
    expect(related[0].merchant.name).toBe("Nike");
    expect(related.map((deal) => deal.id)).not.toContain(target.id);
  });
});

describe("clicks", () => {
  it("increments the deal counter and records the channel", () => {
    const deal = makeDeal();

    recordClick({ dealId: deal.id, merchantId: nikeId, src: "youtube" }, db);
    recordClick({ dealId: deal.id, merchantId: nikeId, src: "tiktok" }, db);

    expect(totalClicks(db)).toBe(2);
    expect(getDealById(deal.id, db)?.clickCount).toBe(2);
    expect(clicksByChannel({}, db).map((row) => row.channel).sort()).toEqual(["tiktok", "youtube"]);
  });

  it("stores only the referrer hostname", () => {
    const deal = makeDeal();
    const click = recordClick(
      { dealId: deal.id, merchantId: nikeId, referrer: "https://www.google.com/search?q=secret" },
      db,
    );

    expect(click.channel).toBe("seo_direct");
    const rows = db
      .prepare<unknown[], { referrer_host: string | null }>("SELECT referrer_host FROM clicks")
      .all();
    expect(rows[0].referrer_host).toBe("google.com");
  });

  it("reports per-source performance", () => {
    const deal = makeDeal({ source: "CJ", sourceExternalId: "x1" });
    recordClick({ dealId: deal.id, merchantId: nikeId, src: "youtube" }, db);

    const [row] = sourcePerformance(db);
    expect(row).toMatchObject({ source: "CJ", deals: 1, activeDeals: 1, clicks: 1 });
  });
});

describe("channel classification", () => {
  it("maps campaign tags onto channels", () => {
    expect(classifyChannel("youtube")).toBe("youtube");
    expect(classifyChannel("yt")).toBe("youtube");
    expect(classifyChannel("youtube_shorts")).toBe("youtube");
    expect(classifyChannel("tiktok")).toBe("tiktok");
    expect(classifyChannel("fb")).toBe("facebook");
    expect(classifyChannel("mystery-tag")).toBe("other");
  });

  it("falls back to the referrer, then to SEO/direct", () => {
    expect(classifyChannel(null, "youtube.com")).toBe("youtube");
    expect(classifyChannel(null, "google.com")).toBe("seo_direct");
    expect(classifyChannel(null, null)).toBe("seo_direct");
    expect(classifyChannel(null, "someblog.example")).toBe("other");
  });

  it("sanitises campaign tags", () => {
    expect(normalizeSrc("  YouTube  ")).toBe("youtube");
    expect(normalizeSrc("<script>")).toBe("script");
    expect(normalizeSrc("")).toBeNull();
  });
});

describe("feedback", () => {
  it("records votes without changing the verified flag", () => {
    const deal = makeDeal();

    recordDealFeedback(deal.id, true, db);
    recordDealFeedback(deal.id, false, db);

    const updated = getDealById(deal.id, db);
    expect(updated?.workedYes).toBe(1);
    expect(updated?.workedNo).toBe(1);
    expect(updated?.verified).toBe(false);
  });
});

describe("submissions", () => {
  it("stores submissions as PENDING and keeps them out of public listings", () => {
    createSubmission(
      {
        merchantName: "Nike",
        couponCode: "user20",
        description: "20% off with this code at checkout.",
        destinationUrl: "https://nike.com/sale",
      },
      db,
    );

    const [submission] = listSubmissions({ status: "PENDING" }, db);
    expect(submission.status).toBe("PENDING");
    expect(submission.couponCode).toBe("USER20");
    expect(listDeals({}, db)).toHaveLength(0);
  });

  it("creates an unverified deal on approval, attributed to the submission source", () => {
    const submission = createSubmission(
      {
        merchantName: "Brand New Store",
        couponCode: "NEW10",
        description: "10% off everything for new customers.",
        destinationUrl: "https://brandnew.example.com/",
      },
      db,
    );

    const result = approveSubmission(submission.id, {}, db);
    expect(result).not.toBeNull();

    const deal = getDealById(result!.dealId, db);
    expect(deal?.source).toBe("USER_SUBMISSION");
    expect(deal?.verified).toBe(false);
    expect(deal?.status).toBe("ACTIVE");
    expect(deal?.merchant.name).toBe("Brand New Store");
    expect(listSubmissions({ status: "APPROVED" }, db)).toHaveLength(1);
  });

  it("does not create a deal when rejected", () => {
    const submission = createSubmission(
      {
        merchantName: "Nike",
        description: "Some offer that does not check out.",
        destinationUrl: "https://nike.com/x",
      },
      db,
    );

    rejectSubmission(submission.id, "Could not reproduce", db);

    expect(listDeals({ status: "ALL" }, db)).toHaveLength(0);
    expect(listSubmissions({ status: "REJECTED" }, db)[0].reviewerNotes).toBe("Could not reproduce");
  });

  it("cannot approve the same submission twice", () => {
    const submission = createSubmission(
      {
        merchantName: "Nike",
        description: "20% off with this code at checkout.",
        destinationUrl: "https://nike.com/sale",
      },
      db,
    );

    expect(approveSubmission(submission.id, {}, db)).not.toBeNull();
    expect(approveSubmission(submission.id, {}, db)).toBeNull();
  });
});

describe("alerts", () => {
  it("stores follow rules and reports that delivery is unconfigured", () => {
    const alert = createAlert({ email: "Reader@Example.com ", merchantId: nikeId, minDiscount: 30 }, db);

    expect(alert.email).toBe("reader@example.com");
    expect(alert.status).toBe("PENDING_DELIVERY_SETUP");
    expect(alertDeliveryStatus().configured).toBe(false);
  });

  it("does not duplicate an identical rule", () => {
    createAlert({ email: "reader@example.com", merchantId: nikeId, minDiscount: 30 }, db);
    createAlert({ email: "reader@example.com", merchantId: nikeId, minDiscount: 30 }, db);

    expect(
      db.prepare<unknown[], { count: number }>("SELECT COUNT(*) AS count FROM deal_alerts").get()?.count,
    ).toBe(1);
  });

  it("matches only offers meeting every part of the rule", () => {
    createAlert({ email: "reader@example.com", merchantId: nikeId, category: "Fashion", minDiscount: 30 }, db);

    expect(matchingAlerts({ merchantId: nikeId, category: "Fashion", discountPercent: 40 }, db)).toHaveLength(1);
    expect(matchingAlerts({ merchantId: nikeId, category: "Fashion", discountPercent: 10 }, db)).toHaveLength(0);
    expect(matchingAlerts({ merchantId: nikeId, category: "Beauty", discountPercent: 40 }, db)).toHaveLength(0);
    expect(matchingAlerts({ merchantId: nikeId, category: "Fashion", discountPercent: null }, db)).toHaveLength(0);
  });
});

describe("resolveOutboundUrl", () => {
  it("prefers the deal's own affiliate URL", () => {
    const resolved = resolveOutboundUrl(
      { affiliateUrl: "https://network.example/click?id=1", destinationUrl: "https://nike.com/sale" },
      null,
    );

    expect(resolved).toMatchObject({ strategy: "deal_affiliate_url", monetized: true });
    expect(resolved.url).toContain("network.example");
  });

  it("expands a merchant deep-link template", () => {
    const resolved = resolveOutboundUrl(
      { affiliateUrl: null, destinationUrl: "https://nike.com/sale" },
      { affiliateBaseUrl: "https://network.example/go?u={destination}" },
    );

    expect(resolved.strategy).toBe("merchant_template");
    expect(resolved.url).toContain(encodeURIComponent("https://nike.com/sale"));
  });

  it("appends the destination as a url parameter when the template has no placeholder", () => {
    const resolved = resolveOutboundUrl(
      { affiliateUrl: null, destinationUrl: "https://nike.com/sale" },
      { affiliateBaseUrl: "https://network.example/go?id=42" },
    );

    expect(resolved.url).toContain("url=https");
  });

  it("adds an Amazon tag only when one is configured and the host is Amazon", () => {
    const previous = process.env.AMAZON_ASSOCIATES_TAG;
    process.env.AMAZON_ASSOCIATES_TAG = "dealscout-20";

    const amazon = resolveOutboundUrl(
      { affiliateUrl: null, destinationUrl: "https://www.amazon.com/dp/B000" },
      null,
    );
    expect(amazon.strategy).toBe("amazon_tag");
    expect(amazon.url).toContain("tag=dealscout-20");

    const other = resolveOutboundUrl(
      { affiliateUrl: null, destinationUrl: "https://nike.com/sale" },
      null,
    );
    expect(other.strategy).toBe("destination_url");
    expect(other.monetized).toBe(false);

    delete process.env.AMAZON_ASSOCIATES_TAG;
    if (previous) process.env.AMAZON_ASSOCIATES_TAG = previous;
  });

  it("falls back to the plain destination when nothing is configured", () => {
    const resolved = resolveOutboundUrl(
      { affiliateUrl: null, destinationUrl: "https://nike.com/sale" },
      { affiliateBaseUrl: null },
    );

    expect(resolved).toMatchObject({ strategy: "destination_url", monetized: false });
  });
});
