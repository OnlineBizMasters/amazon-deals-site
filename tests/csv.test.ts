import { describe, expect, it } from "vitest";
import { detectDelimiter, normalizeHeader, parseCsv, toCsv } from "@/lib/import/csv";

describe("parseCsv", () => {
  it("parses a simple comma-separated file", () => {
    const result = parseCsv("merchant,title\nNike,20% off\nAdobe,40% off");

    expect(result.headers).toEqual(["merchant", "title"]);
    expect(result.rows).toEqual([
      { merchant: "Nike", title: "20% off" },
      { merchant: "Adobe", title: "40% off" },
    ]);
  });

  it("handles quoted fields containing commas, quotes and newlines", () => {
    const csv = 'merchant,title\nNike,"20% off, today only"\nAdobe,"Says ""save big"""\nREI,"Line one\nLine two"';
    const result = parseCsv(csv);

    expect(result.rows[0].title).toBe("20% off, today only");
    expect(result.rows[1].title).toBe('Says "save big"');
    expect(result.rows[2].title).toBe("Line one\nLine two");
  });

  it("strips a UTF-8 BOM and tolerates CRLF line endings", () => {
    const result = parseCsv("\uFEFFmerchant,title\r\nNike,Sale\r\n");

    expect(result.headers).toEqual(["merchant", "title"]);
    expect(result.rows).toEqual([{ merchant: "Nike", title: "Sale" }]);
  });

  it("skips blank lines rather than emitting empty rows", () => {
    const result = parseCsv("merchant,title\nNike,Sale\n\n\nAdobe,Deal\n");

    expect(result.rows).toHaveLength(2);
  });

  it("fills missing trailing columns with empty strings", () => {
    const result = parseCsv("merchant,title,coupon_code\nNike,Sale");

    expect(result.rows[0]).toEqual({ merchant: "Nike", title: "Sale", coupon_code: "" });
  });

  it("reports the source line number for each row", () => {
    const result = parseCsv('merchant,title\nNike,"Two\nlines"\nAdobe,Deal');

    expect(result.lineNumbers).toEqual([2, 4]);
  });

  it("detects semicolon and tab delimiters", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");

    const semi = parseCsv("merchant;title\nNike;Sale");
    expect(semi.delimiter).toBe(";");
    expect(semi.rows[0]).toEqual({ merchant: "Nike", title: "Sale" });
  });

  it("ignores delimiters inside quoted header cells when detecting", () => {
    expect(detectDelimiter('"a,b";c\n1;2')).toBe(";");
  });

  it("returns empty results for empty input", () => {
    expect(parseCsv("").rows).toEqual([]);
    expect(parseCsv("").headers).toEqual([]);
  });
});

describe("normalizeHeader", () => {
  it("snake-cases and strips punctuation", () => {
    expect(normalizeHeader("Coupon Code")).toBe("coupon_code");
    expect(normalizeHeader("expiration-date")).toBe("expiration_date");
    expect(normalizeHeader("  Sale Price ($) ")).toBe("sale_price_");
  });
});

describe("toCsv", () => {
  it("quotes values containing separators, quotes or newlines", () => {
    const csv = toCsv(["a", "b"], [["plain", 'has "quotes", commas']]);

    expect(csv).toBe('a,b\nplain,"has ""quotes"", commas"');
  });

  it("round-trips through the parser", () => {
    const csv = toCsv(["merchant", "title"], [["Nike", "Save 20%, today"]]);
    const parsed = parseCsv(csv);

    expect(parsed.rows[0]).toEqual({ merchant: "Nike", title: "Save 20%, today" });
  });
});
