import { describe, expect, it } from "vitest";
import { buildSearchHref, PAGE_SIZE, parseSearchParams } from "@/lib/queries/search";
import { createTestDb } from "@/lib/db/client";
import { seedDemoData } from "@/lib/seed/seed";
import { countDeals, listDeals } from "@/lib/repos/deals";
import { listMerchants } from "@/lib/repos/merchants";

describe("parseSearchParams", () => {
  it("defaults to active offers ranked by Deal Score", () => {
    const parsed = parseSearchParams({});

    expect(parsed.query).toMatchObject({ status: "ACTIVE", sort: "best", limit: PAGE_SIZE, offset: 0 });
    expect(parsed.page).toBe(1);
  });

  it("accepts the documented filters", () => {
    const parsed = parseSearchParams({
      q: "  running shoes ",
      category: "Fashion",
      merchant: "nike",
      type: "promo_code",
      verified: "1",
      ending: "1",
      minDiscount: "30",
      sort: "discount",
      page: "3",
    });

    expect(parsed.applied).toMatchObject({
      q: "running shoes",
      category: "Fashion",
      merchant: "nike",
      type: "PROMO_CODE",
      verifiedOnly: true,
      endingSoon: true,
      minDiscount: 30,
      sort: "discount",
    });
    expect(parsed.query.endingWithinDays).toBe(7);
    expect(parsed.query.offset).toBe(2 * PAGE_SIZE);
  });

  it("ignores invalid values rather than failing", () => {
    const parsed = parseSearchParams({
      type: "NONSENSE",
      minDiscount: "-5",
      sort: "chaos",
      page: "0",
    });

    expect(parsed.applied.type).toBeNull();
    expect(parsed.applied.minDiscount).toBeNull();
    expect(parsed.applied.sort).toBe("best");
    expect(parsed.page).toBe(1);
  });

  it("caps a runaway discount and page number", () => {
    expect(parseSearchParams({ minDiscount: "5000" }).applied.minDiscount).toBeNull();
    expect(parseSearchParams({ page: "99999" }).page).toBe(200);
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseSearchParams({ q: ["first", "second"] }).applied.q).toBe("first");
  });

  it("preserves filters when building pagination links", () => {
    const href = buildSearchHref({ q: "shoes", category: "Fashion" }, { page: "2" });

    expect(href).toContain("q=shoes");
    expect(href).toContain("category=Fashion");
    expect(href).toContain("page=2");
  });

  it("drops a parameter when the override is null", () => {
    expect(buildSearchHref({ q: "shoes", page: "4" }, { page: null })).not.toContain("page");
  });
});

describe("demo seed data", () => {
  it("creates merchants and deals across several categories", () => {
    const db = createTestDb();
    const result = seedDemoData(db);

    expect(result.merchants).toBeGreaterThan(10);
    expect(result.deals).toBeGreaterThan(30);

    const categories = new Set(listDeals({ status: "ALL", limit: 500 }, db).map((deal) => deal.category));
    expect(categories.size).toBeGreaterThan(5);
  });

  it("flags every seeded record as sample data", () => {
    const db = createTestDb({ seed: true });

    expect(listDeals({ status: "ALL", limit: 500 }, db).every((deal) => deal.isDemo)).toBe(true);
    expect(listMerchants({ status: "ALL", limit: 500 }, db).every((merchant) => merchant.isDemo)).toBe(
      true,
    );
  });

  it("prefixes every sample coupon code so it cannot be mistaken for a real one", () => {
    const db = createTestDb({ seed: true });
    const codes = listDeals({ status: "ALL", limit: 500 }, db)
      .map((deal) => deal.couponCode)
      .filter((code): code is string => Boolean(code));

    expect(codes.length).toBeGreaterThan(5);
    expect(codes.every((code) => code.startsWith("DEMO"))).toBe(true);
  });

  it("includes each status so every page state can be exercised", () => {
    const db = createTestDb({ seed: true });

    expect(countDeals({ status: "ACTIVE" }, db)).toBeGreaterThan(0);
    expect(countDeals({ status: "EXPIRED" }, db)).toBeGreaterThan(0);
    expect(countDeals({ status: "PENDING" }, db)).toBeGreaterThan(0);
    expect(countDeals({ status: "DISABLED" }, db)).toBeGreaterThan(0);
  });

  it("keeps recorded clicks consistent with the stored click counters", () => {
    const db = createTestDb({ seed: true });

    const counters = db
      .prepare<unknown[], { total: number }>("SELECT SUM(click_count) AS total FROM deals")
      .get();
    const rows = db.prepare<unknown[], { total: number }>("SELECT COUNT(*) AS total FROM clicks").get();

    expect(rows?.total).toBe(counters?.total);
  });

  it("only exposes active offers to the public listing", () => {
    const db = createTestDb({ seed: true });

    expect(listDeals({ limit: 500 }, db).every((deal) => deal.status === "ACTIVE")).toBe(true);
  });
});
