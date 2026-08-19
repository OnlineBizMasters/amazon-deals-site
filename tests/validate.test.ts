import { describe, expect, it } from "vitest";
import { checkHeaders, validateRow } from "@/lib/import/validate";

const validRow = {
  merchant: "Nike",
  title: "20% off full-price styles",
  coupon_code: "SAVE20",
  destination_url: "https://www.nike.com/sale",
  discount_percent: "20",
  expiration_date: "2030-12-31",
};

function messages(issues: { field: string; message: string }[]): string[] {
  return issues.map((issue) => issue.field);
}

describe("validateRow", () => {
  it("accepts a complete row and normalises it", () => {
    const result = validateRow(validRow, 1, 2);

    expect(result.errors).toEqual([]);
    expect(result.offer).not.toBeNull();
    expect(result.offer?.merchantName).toBe("Nike");
    expect(result.offer?.couponCode).toBe("SAVE20");
    expect(result.offer?.type).toBe("PROMO_CODE");
    expect(result.offer?.discountPercent).toBe(20);
    expect(result.offer?.expiresAt).toBe("2030-12-31T23:59:59.000Z");
    expect(result.offer?.source).toBe("CSV");
  });

  it("requires merchant, title and destination URL", () => {
    const result = validateRow({}, 1, 2);

    expect(messages(result.errors)).toEqual(
      expect.arrayContaining(["merchant", "title", "destination_url"]),
    );
    expect(result.offer).toBeNull();
  });

  it("rejects a destination URL that is not absolute http(s)", () => {
    const result = validateRow({ ...validRow, destination_url: "javascript:alert(1)" }, 1, 2);

    expect(messages(result.errors)).toContain("destination_url");
    expect(result.offer).toBeNull();
  });

  it("rejects a PROMO_CODE row with no code", () => {
    const result = validateRow(
      { ...validRow, coupon_code: "", deal_type: "PROMO_CODE" },
      1,
      2,
    );

    expect(messages(result.errors)).toContain("coupon_code");
  });

  it("drops an invalid affiliate URL with a warning instead of failing the row", () => {
    const result = validateRow({ ...validRow, affiliate_url: "not a url" }, 1, 2);

    expect(result.errors).toEqual([]);
    expect(messages(result.warnings)).toContain("affiliate_url");
    expect(result.offer?.affiliateUrl).toBeNull();
  });

  it("warns when the expiry has already passed", () => {
    const result = validateRow({ ...validRow, expiration_date: "2000-01-01" }, 1, 2, {
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(result.errors).toEqual([]);
    expect(messages(result.warnings)).toContain("expiration_date");
  });

  it("errors when the start date is after the expiry", () => {
    const result = validateRow(
      { ...validRow, start_date: "2030-06-01", expiration_date: "2030-01-01" },
      1,
      2,
    );

    expect(messages(result.errors)).toContain("start_date");
  });

  it("warns when the sale price is above the original price", () => {
    const result = validateRow(
      { ...validRow, original_price: "50", sale_price: "80" },
      1,
      2,
    );

    expect(messages(result.warnings)).toContain("sale_price");
  });

  it("infers DEAL when no code is supplied", () => {
    const result = validateRow({ ...validRow, coupon_code: "" }, 1, 2);

    expect(result.offer?.type).toBe("DEAL");
    expect(result.offer?.couponCode).toBeNull();
  });

  it("never invents a discount that was not supplied", () => {
    const result = validateRow(
      { merchant: "Nike", title: "Free shipping sitewide", destination_url: "https://nike.com/" },
      1,
      2,
    );

    expect(result.offer?.discountPercent).toBeNull();
    expect(result.offer?.discountAmount).toBeNull();
    expect(result.offer?.originalPrice).toBeNull();
    expect(result.offer?.salePrice).toBeNull();
  });

  it("honours the default source and per-row overrides", () => {
    expect(validateRow(validRow, 1, 2, { defaultSource: "AWIN" }).offer?.source).toBe("AWIN");
    expect(validateRow({ ...validRow, source: "cj" }, 1, 2, { defaultSource: "AWIN" }).offer?.source).toBe(
      "CJ",
    );
  });
});

describe("checkHeaders", () => {
  it("reports missing required columns", () => {
    const check = checkHeaders(["merchant", "title"]);

    expect(check.missingRequired).toEqual(["destination_url"]);
  });

  it("accepts aliased headers as satisfying the requirements", () => {
    const check = checkHeaders(["store", "offer_title", "landing_url"]);

    expect(check.missingRequired).toEqual([]);
    expect(check.recognised).toEqual(expect.arrayContaining(["merchant", "title", "destination_url"]));
  });

  it("lists unknown columns", () => {
    const check = checkHeaders(["merchant", "title", "destination_url", "mystery"]);

    expect(check.unknown).toEqual(["mystery"]);
  });
});
