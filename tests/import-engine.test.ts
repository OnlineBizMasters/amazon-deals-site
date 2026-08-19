import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import { commitImport, planImportFromCsv } from "@/lib/import/engine";
import { titleSimilarity } from "@/lib/import/dedupe";
import { countDeals, getDealBySourceExternalId, listDeals } from "@/lib/repos/deals";
import { listMerchants } from "@/lib/repos/merchants";
import { listImportBatches, parseImportReport } from "@/lib/repos/imports";

const HEADER = "merchant,title,coupon_code,destination_url,discount_percent,expiration_date,source,external_id";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

describe("planImportFromCsv", () => {
  it("plans new rows as CREATE and reports new merchants", () => {
    const plan = planImportFromCsv(
      csv("Nike,20% off styles,SAVE20,https://nike.com/sale,20,2030-01-01,CSV,n-1"),
      {},
      db,
    );

    expect(plan.fatalError).toBeNull();
    expect(plan.summary).toMatchObject({ total: 1, create: 1, update: 0, skip: 0, error: 0, newMerchants: 1 });
    expect(plan.rows[0].merchant?.willCreate).toBe(true);
  });

  it("reports a fatal error when a required column is missing", () => {
    const plan = planImportFromCsv("merchant,title\nNike,Sale", {}, db);

    expect(plan.fatalError).toContain("destination_url");
  });

  it("reports a fatal error for an empty file or a header with no rows", () => {
    expect(planImportFromCsv("", {}, db).fatalError).toContain("empty");
    expect(planImportFromCsv(HEADER, {}, db).fatalError).toContain("no data rows");
  });

  it("flags rows that duplicate each other inside the same file", () => {
    const plan = planImportFromCsv(
      csv(
        "Nike,20% off styles,SAVE20,https://nike.com/sale,20,,CSV,n-1",
        "Nike,Twenty percent off,SAVE20,https://nike.com/other,20,,CSV,n-2",
      ),
      {},
      db,
    );

    expect(plan.summary.create).toBe(1);
    expect(plan.summary.skip).toBe(1);
    expect(plan.rows[1].warnings.some((issue) => issue.message.includes("Duplicates row 1"))).toBe(true);
  });

  it("marks malformed rows as ERROR without discarding the rest of the file", () => {
    const plan = planImportFromCsv(
      csv(
        "Nike,20% off styles,SAVE20,https://nike.com/sale,20,,CSV,n-1",
        ",Missing merchant,CODE,https://nike.com/x,10,,CSV,n-2",
      ),
      {},
      db,
    );

    expect(plan.summary.create).toBe(1);
    expect(plan.summary.error).toBe(1);
  });
});

describe("commitImport", () => {
  it("creates merchants and deals, and records a batch", () => {
    const plan = planImportFromCsv(
      csv(
        "Nike,20% off styles,SAVE20,https://nike.com/sale,20,2030-01-01,CSV,n-1",
        "Adobe,40% off first year,CREATE40,https://adobe.com/plans,40,,CSV,a-1",
      ),
      { filename: "offers.csv" },
      db,
    );

    const result = commitImport(plan, {}, db);

    expect(result.createdDealIds).toHaveLength(2);
    expect(countDeals({ status: "ACTIVE" }, db)).toBe(2);
    expect(listMerchants({ limit: 50 }, db).map((merchant) => merchant.name).sort()).toEqual([
      "Adobe",
      "Nike",
    ]);

    const [batch] = listImportBatches(5, db);
    expect(batch).toMatchObject({ filename: "offers.csv", created: 2, skipped: 0, failed: 0, dryRun: false });
    expect(parseImportReport(batch)).toHaveLength(2);
  });

  it("writes nothing on a dry run but still records the batch", () => {
    const plan = planImportFromCsv(
      csv("Nike,20% off styles,SAVE20,https://nike.com/sale,20,,CSV,n-1"),
      {},
      db,
    );

    commitImport(plan, { dryRun: true }, db);

    expect(countDeals({ status: "ALL" }, db)).toBe(0);
    expect(listImportBatches(5, db)[0].dryRun).toBe(true);
  });

  it("updates an existing deal when source and external id match", () => {
    const first = planImportFromCsv(
      csv("Nike,20% off styles,SAVE20,https://nike.com/sale,20,,CSV,n-1"),
      {},
      db,
    );
    commitImport(first, {}, db);

    const second = planImportFromCsv(
      csv("Nike,30% off styles,SAVE30,https://nike.com/sale,30,,CSV,n-1"),
      {},
      db,
    );

    expect(second.summary).toMatchObject({ create: 0, update: 1 });
    expect(second.rows[0].duplicate?.reason).toBe("source_external_id");

    commitImport(second, {}, db);

    expect(countDeals({ status: "ALL" }, db)).toBe(1);
    const deal = getDealBySourceExternalId("CSV", "n-1", db);
    expect(deal?.title).toBe("30% off styles");
    expect(deal?.couponCode).toBe("SAVE30");
    expect(deal?.discountPercent).toBe(30);
  });

  it("skips a row that repeats a merchant's coupon code", () => {
    commitImport(
      planImportFromCsv(csv("Nike,20% off,SAVE20,https://nike.com/sale,20,,CSV,n-1"), {}, db),
      {},
      db,
    );

    const plan = planImportFromCsv(
      csv("nike ,Completely different wording,save20,https://nike.com/elsewhere,25,,MANUAL,"),
      {},
      db,
    );

    expect(plan.rows[0].action).toBe("SKIP_DUPLICATE");
    expect(plan.rows[0].duplicate?.reason).toBe("merchant_coupon_code");

    commitImport(plan, {}, db);
    expect(countDeals({ status: "ALL" }, db)).toBe(1);
  });

  it("skips a row that repeats a merchant's destination URL", () => {
    commitImport(
      planImportFromCsv(csv("Nike,20% off,,https://www.nike.com/sale,20,,CSV,n-1"), {}, db),
      {},
      db,
    );

    const plan = planImportFromCsv(
      csv("Nike,Different headline entirely,,http://nike.com/sale?utm_source=feed,25,,MANUAL,"),
      {},
      db,
    );

    expect(plan.rows[0].duplicate?.reason).toBe("merchant_destination_url");
  });

  it("skips a near-identical active deal for the same merchant", () => {
    commitImport(
      planImportFromCsv(
        csv("Nike,Extra 25% off running shoes,,https://nike.com/running,25,,CSV,n-1"),
        {},
        db,
      ),
      {},
      db,
    );

    const plan = planImportFromCsv(
      csv("Nike,Extra 25% off running shoes,,https://nike.com/running-shoes,25,,MANUAL,"),
      {},
      db,
    );

    expect(plan.rows[0].action).toBe("SKIP_DUPLICATE");
    expect(plan.rows[0].duplicate?.reason).toBe("similar_active_deal");
  });

  it("imports a row whose expiry has already passed as EXPIRED", () => {
    const plan = planImportFromCsv(
      csv("Nike,Old promotion,OLD10,https://nike.com/old,10,2000-01-01,CSV,n-old"),
      {},
      db,
    );

    commitImport(plan, {}, db);

    expect(countDeals({ status: "ACTIVE" }, db)).toBe(0);
    expect(countDeals({ status: "EXPIRED" }, db)).toBe(1);
  });

  it("derives the discount percentage from prices when none is supplied", () => {
    const plan = planImportFromCsv(
      "merchant,title,destination_url,original_price,sale_price\nNike,Shoes reduced,https://nike.com/shoes,100,60",
      {},
      db,
    );

    commitImport(plan, {}, db);

    const [deal] = listDeals({ limit: 1 }, db);
    expect(deal.discountPercent).toBe(40);
  });

  it("does not mark imported offers as sample data by default", () => {
    commitImport(
      planImportFromCsv(csv("Nike,20% off,SAVE20,https://nike.com/sale,20,,CSV,n-1"), {}, db),
      {},
      db,
    );

    expect(listDeals({ limit: 1 }, db)[0].isDemo).toBe(false);
  });
});

describe("titleSimilarity", () => {
  it("scores identical wording as 1", () => {
    expect(titleSimilarity("20% off running shoes", "20% off running shoes")).toBe(1);
  });

  it("ignores filler words when comparing", () => {
    expect(titleSimilarity("Get 20% off your running shoes", "20% off running shoes")).toBeGreaterThan(
      0.8,
    );
  });

  it("scores unrelated titles low", () => {
    expect(titleSimilarity("20% off running shoes", "Free shipping on furniture")).toBeLessThan(0.2);
  });
});
