import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type Db } from "@/lib/db/client";
import { createDeal, countDeals, getDealById, listDeals, updateDeal } from "@/lib/repos/deals";
import { createMerchant } from "@/lib/repos/merchants";
import { isExpired, runExpirationSweep } from "@/lib/services/expiration";

let db: Db;
let merchantId: string;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

beforeEach(() => {
  db = createTestDb();
  merchantId = createMerchant({ name: "Nike", category: "Fashion" }, db).id;
});

function makeDeal(expiresAt: string | null, status: "ACTIVE" | "EXPIRED" = "ACTIVE") {
  return createDeal(
    {
      merchantId,
      title: `Offer expiring ${expiresAt ?? "never"}`,
      type: "DEAL",
      destinationUrl: "https://nike.com/sale",
      expiresAt,
      status,
      discountPercent: 20,
    },
    db,
  );
}

describe("isExpired", () => {
  it("treats a missing expiry as no end date", () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
  });

  it("treats an unparseable expiry as not expired rather than guessing", () => {
    expect(isExpired("not a date")).toBe(false);
  });

  it("compares against the supplied clock", () => {
    expect(isExpired("2026-01-01T00:00:00Z", new Date("2026-06-01T00:00:00Z"))).toBe(true);
    expect(isExpired("2026-12-01T00:00:00Z", new Date("2026-06-01T00:00:00Z"))).toBe(false);
  });
});

describe("runExpirationSweep", () => {
  it("moves lapsed ACTIVE deals to EXPIRED", () => {
    makeDeal(daysFromNow(-1));
    makeDeal(daysFromNow(5));
    makeDeal(null);

    const result = runExpirationSweep(db);

    expect(result.expired).toBe(1);
    expect(countDeals({ status: "ACTIVE" }, db)).toBe(2);
    expect(countDeals({ status: "EXPIRED" }, db)).toBe(1);
  });

  it("keeps expired deals in the database for history", () => {
    const deal = makeDeal(daysFromNow(-1));
    runExpirationSweep(db);

    const stored = getDealById(deal.id, db);
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("EXPIRED");
  });

  it("excludes expired deals from active listings", () => {
    makeDeal(daysFromNow(-1));
    runExpirationSweep(db);

    expect(listDeals({ status: "ACTIVE" }, db)).toHaveLength(0);
    expect(listDeals({ status: "EXPIRED" }, db)).toHaveLength(1);
  });

  it("reactivates a deal whose expiry was pushed into the future", () => {
    const deal = makeDeal(daysFromNow(-1));
    runExpirationSweep(db);
    expect(getDealById(deal.id, db)?.status).toBe("EXPIRED");

    updateDeal(deal.id, { expiresAt: daysFromNow(10) }, db);
    const result = runExpirationSweep(db);

    expect(result.reactivated).toBe(1);
    expect(getDealById(deal.id, db)?.status).toBe("ACTIVE");
  });

  it("leaves DISABLED and PENDING deals alone", () => {
    createDeal(
      {
        merchantId,
        title: "Disabled offer",
        type: "DEAL",
        destinationUrl: "https://nike.com/x",
        expiresAt: daysFromNow(-5),
        status: "DISABLED",
      },
      db,
    );
    createDeal(
      {
        merchantId,
        title: "Pending offer",
        type: "DEAL",
        destinationUrl: "https://nike.com/y",
        expiresAt: daysFromNow(10),
        status: "PENDING",
      },
      db,
    );

    runExpirationSweep(db);

    expect(countDeals({ status: "DISABLED" }, db)).toBe(1);
    expect(countDeals({ status: "PENDING" }, db)).toBe(1);
  });

  it("is idempotent", () => {
    makeDeal(daysFromNow(-1));

    expect(runExpirationSweep(db).expired).toBe(1);
    expect(runExpirationSweep(db).expired).toBe(0);
  });
});
