import { afterEach, describe, expect, it } from "vitest";
import { CONNECTORS, connectorSummaries, getConnector, readyConnectorIds } from "@/lib/connectors/registry";
import { ConnectorNotConfiguredError, ConnectorNotImplementedError } from "@/lib/connectors/types";
import { OFFER_SOURCES } from "@/lib/domain/types";

const NETWORK_IDS = ["cj", "awin", "impact", "rakuten", "partnerize", "amazon", "direct"];

afterEach(() => {
  for (const connector of CONNECTORS) {
    for (const credential of connector.credentials) {
      delete process.env[credential.env];
    }
  }
});

describe("connector registry", () => {
  it("registers a connector for every affiliate network in the brief", () => {
    for (const id of NETWORK_IDS) {
      expect(getConnector(id), `missing connector: ${id}`).not.toBeNull();
    }
  });

  it("exposes manual entry and CSV as the connectors that work today", () => {
    expect(readyConnectorIds().sort()).toEqual(["csv", "manual"]);
  });

  it("uses a valid offer source key for every connector", () => {
    for (const connector of CONNECTORS) {
      expect(OFFER_SOURCES).toContain(connector.source);
    }
  });

  it("reports network connectors as unconfigured when credentials are absent", () => {
    const summaries = connectorSummaries().filter((entry) => NETWORK_IDS.includes(entry.connector.id));

    for (const { connector, status } of summaries) {
      expect(status.state, connector.id).toBe("unconfigured");
      expect(status.missingEnv.length).toBeGreaterThan(0);
      expect(status.message).toContain(connector.label);
    }
  });

  it("names the credentials each network will require", () => {
    expect(getConnector("cj")?.credentials.map((credential) => credential.env)).toEqual([
      "CJ_PERSONAL_ACCESS_TOKEN",
      "CJ_PUBLISHER_ID",
    ]);
    expect(getConnector("rakuten")?.credentials).toHaveLength(3);
    expect(getConnector("direct")?.credentials.some((credential) => !credential.required)).toBe(true);
  });
});

describe("unconfigured connectors fail loudly", () => {
  it("throws ConnectorNotConfiguredError with the missing variables listed", async () => {
    const cj = getConnector("cj")!;

    await expect(cj.fetchOffers()).rejects.toThrow(ConnectorNotConfiguredError);
    await expect(cj.fetchOffers()).rejects.toThrow(/CJ_PERSONAL_ACCESS_TOKEN/);
  });

  it("throws ConnectorNotImplementedError once credentials exist but no client does", async () => {
    process.env.CJ_PERSONAL_ACCESS_TOKEN = "token";
    process.env.CJ_PUBLISHER_ID = "12345";

    const cj = getConnector("cj")!;
    expect(cj.status().state).toBe("not_implemented");
    await expect(cj.fetchOffers()).rejects.toThrow(ConnectorNotImplementedError);
  });

  it("never returns fabricated offers", async () => {
    for (const id of NETWORK_IDS) {
      const connector = getConnector(id)!;
      await expect(connector.fetchOffers(), id).rejects.toThrow();
    }
  });
});

describe("CSV connector", () => {
  it("converts supplied CSV text into normalised offers", async () => {
    const csv = getConnector("csv")!;
    const offers = await csv.fetchOffers({
      payload:
        "merchant,title,coupon_code,destination_url,discount_percent\nNike,20% off,SAVE20,https://nike.com/sale,20",
    });

    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      merchantName: "Nike",
      couponCode: "SAVE20",
      type: "PROMO_CODE",
      discountPercent: 20,
      source: "CSV",
    });
  });

  it("drops invalid rows rather than importing broken data", async () => {
    const csv = getConnector("csv")!;
    const offers = await csv.fetchOffers({
      payload: "merchant,title,destination_url\nNike,Good offer,https://nike.com/sale\n,Bad row,not-a-url",
    });

    expect(offers).toHaveLength(1);
  });

  it("returns nothing when given no payload", async () => {
    expect(await getConnector("csv")!.fetchOffers()).toEqual([]);
  });
});

describe("manual connector", () => {
  it("is always ready and has nothing to pull", async () => {
    const manual = getConnector("manual")!;

    expect(manual.status().state).toBe("ready");
    expect(manual.credentials).toEqual([]);
    expect(await manual.fetchOffers()).toEqual([]);
  });
});
