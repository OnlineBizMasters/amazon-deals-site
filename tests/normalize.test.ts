import { describe, expect, it } from "vitest";
import {
  canonicalColumn,
  normalizeCouponCode,
  normalizeCurrency,
  normalizeDealType,
  normalizeSource,
  parseBoolean,
  parseDate,
  parsePercent,
  parsePrice,
  remapRow,
} from "@/lib/import/normalize";
import { normalizeUrl, parseHttpUrl, urlDedupeKey } from "@/lib/utils/url";
import { slugify, uniqueSlug } from "@/lib/utils/slug";

describe("column mapping", () => {
  it("maps common feed aliases onto canonical columns", () => {
    expect(canonicalColumn("store")).toBe("merchant");
    expect(canonicalColumn("advertiser")).toBe("merchant");
    expect(canonicalColumn("voucher_code")).toBe("coupon_code");
    expect(canonicalColumn("tracking_url")).toBe("affiliate_url");
    expect(canonicalColumn("valid_to")).toBe("expiration_date");
  });

  it("returns null for unknown columns", () => {
    expect(canonicalColumn("random_extra_field")).toBeNull();
  });

  it("remaps a whole row and keeps the first match for a canonical name", () => {
    const remapped = remapRow({ store: "Nike", title: "Sale", nonsense: "x" });

    expect(remapped).toEqual({ merchant: "Nike", title: "Sale" });
  });
});

describe("parsePrice", () => {
  it("reads plain and currency-formatted numbers", () => {
    expect(parsePrice("59.99")).toBe(59.99);
    expect(parsePrice("$1,299.00")).toBe(1299);
    expect(parsePrice("USD 45")).toBe(45);
  });

  it("reads European formatting", () => {
    expect(parsePrice("1.299,00")).toBe(1299);
    expect(parsePrice("19,99")).toBe(19.99);
  });

  it("treats a three-digit group after a comma as a thousands separator", () => {
    expect(parsePrice("1,299")).toBe(1299);
  });

  it("returns null for unusable input rather than guessing", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("free")).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice("-5")).toBeNull();
  });
});

describe("parsePercent", () => {
  it("reads percentages with and without the sign", () => {
    expect(parsePercent("20")).toBe(20);
    expect(parsePercent("20%")).toBe(20);
  });

  it("treats a decimal fraction as a percentage", () => {
    expect(parsePercent("0.4")).toBe(40);
  });

  it("rejects values above 100", () => {
    expect(parsePercent("150")).toBeNull();
  });

  it("returns null for unparseable values", () => {
    expect(parsePercent("half off")).toBeNull();
    expect(parsePercent("")).toBeNull();
  });
});

describe("parseDate", () => {
  it("expands a date-only expiry to the end of that day", () => {
    expect(parseDate("2026-12-31", { endOfDay: true })).toBe("2026-12-31T23:59:59.000Z");
  });

  it("uses the start of the day when not an expiry", () => {
    expect(parseDate("2026-12-31")).toBe("2026-12-31T00:00:00.000Z");
  });

  it("reads US-style dates", () => {
    expect(parseDate("12/31/2026", { endOfDay: true })).toBe("2026-12-31T23:59:59.000Z");
  });

  it("returns null for junk", () => {
    expect(parseDate("soon")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("coupon codes and types", () => {
  it("uppercases and strips whitespace", () => {
    expect(normalizeCouponCode(" save 20 ")).toBe("SAVE20");
  });

  it("treats placeholder values as no code", () => {
    expect(normalizeCouponCode("none")).toBeNull();
    expect(normalizeCouponCode("N/A")).toBeNull();
    expect(normalizeCouponCode("-")).toBeNull();
  });

  it("infers the type from an explicit value or the presence of a code", () => {
    expect(normalizeDealType("coupon", null)).toBe("PROMO_CODE");
    expect(normalizeDealType("sale", null)).toBe("DEAL");
    expect(normalizeDealType("", "SAVE20")).toBe("PROMO_CODE");
    expect(normalizeDealType("", null)).toBe("DEAL");
  });
});

describe("source normalisation", () => {
  it("recognises canonical and aliased network names", () => {
    expect(normalizeSource("cj", "CSV")).toBe("CJ");
    expect(normalizeSource("Commission Junction", "CSV")).toBe("CJ");
    expect(normalizeSource("Rakuten Advertising", "CSV")).toBe("RAKUTEN");
    expect(normalizeSource("linkshare", "CSV")).toBe("RAKUTEN");
  });

  it("falls back when the value is unknown or empty", () => {
    expect(normalizeSource("", "MANUAL")).toBe("MANUAL");
    expect(normalizeSource("mystery-network", "CSV")).toBe("CSV");
  });
});

describe("currency and booleans", () => {
  it("accepts three-letter codes and defaults to USD", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
    expect(normalizeCurrency("dollars")).toBe("USD");
    expect(normalizeCurrency("")).toBe("USD");
  });

  it("reads truthy strings", () => {
    expect(parseBoolean("yes")).toBe(true);
    expect(parseBoolean("TRUE")).toBe(true);
    expect(parseBoolean("1")).toBe(true);
    expect(parseBoolean("no")).toBe(false);
    expect(parseBoolean("")).toBe(false);
  });
});

describe("URL handling", () => {
  it("accepts absolute http(s) URLs and adds a missing scheme", () => {
    expect(parseHttpUrl("https://store.com/sale")?.hostname).toBe("store.com");
    expect(parseHttpUrl("store.com/sale")?.protocol).toBe("https:");
  });

  it("rejects unsafe or relative URLs", () => {
    expect(parseHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpUrl("data:text/html,hi")).toBeNull();
    expect(parseHttpUrl("/relative/path")).toBeNull();
    expect(parseHttpUrl("localhost")).toBeNull();
    expect(parseHttpUrl("")).toBeNull();
  });

  it("normalises host casing and trailing slashes", () => {
    expect(normalizeUrl("HTTPS://Store.com/Sale/")).toBe("https://store.com/Sale");
    expect(normalizeUrl("https://store.com/sale#top")).toBe("https://store.com/sale");
  });

  it("collapses protocol, www and query string for duplicate detection", () => {
    expect(urlDedupeKey("https://www.store.com/sale?utm_source=x")).toBe("store.com/sale");
    expect(urlDedupeKey("http://store.com/sale/")).toBe("store.com/sale");
  });
});

describe("slugs", () => {
  it("produces readable URL slugs", () => {
    expect(slugify("Nike — 20% off Full-Price Styles!")).toBe("nike-20-off-full-price-styles");
    expect(slugify("Home & Kitchen")).toBe("home-and-kitchen");
  });

  it("appends a numeric suffix when a slug is taken", () => {
    const taken = new Set(["nike-sale", "nike-sale-2"]);
    expect(uniqueSlug("Nike Sale", (candidate) => taken.has(candidate))).toBe("nike-sale-3");
  });

  it("falls back to a placeholder for unusable input", () => {
    expect(slugify("!!!")).toBe("");
    expect(uniqueSlug("!!!", () => false)).toBe("offer");
  });
});
