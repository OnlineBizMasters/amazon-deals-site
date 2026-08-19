import { parseCsv } from "../import/csv";
import { validateRow } from "../import/validate";
import type { NormalizedOffer } from "../import/validate";
import { NETWORK_CONNECTORS } from "./network";
import type { FetchOffersOptions, OfferConnector } from "./types";

/**
 * The connector registry.
 *
 * Adding a source means appending one connector here — nothing else in the
 * import, ranking or publishing pipeline needs to change.
 */

/** Offers typed by an administrator in the admin UI. Always available. */
const manualConnector: OfferConnector = {
  id: "manual",
  label: "Manual entry",
  source: "MANUAL",
  description:
    "Deals and coupons entered by an administrator in the admin dashboard. Always available and requires no credentials.",
  docsUrl: null,
  credentials: [],
  integrationNotes: "Fully implemented. Create and edit offers under Admin → Deals.",
  status: () => ({
    state: "ready",
    message: "Manual entry is available in the admin dashboard.",
    missingEnv: [],
  }),
  async fetchOffers(): Promise<NormalizedOffer[]> {
    // Manual offers are written directly through the admin UI, so there is
    // nothing to pull.
    return [];
  },
};

/**
 * CSV / delimited feed text. Working today: the admin importer pipes uploaded
 * files through here, and any merchant feed already in CSV form can use it too.
 */
const csvConnector: OfferConnector = {
  id: "csv",
  label: "CSV / delimited feed",
  source: "CSV",
  description:
    "Parses uploaded CSV files or supplied delimited feed text. Handles comma, semicolon, tab and pipe delimiters and maps common column aliases automatically.",
  docsUrl: null,
  credentials: [],
  integrationNotes: "Fully implemented. Upload files under Admin → Imports.",
  status: () => ({
    state: "ready",
    message: "CSV import is available in the admin dashboard.",
    missingEnv: [],
  }),
  async fetchOffers(options: FetchOffersOptions = {}): Promise<NormalizedOffer[]> {
    if (!options.payload?.trim()) return [];

    const parsed = parseCsv(options.payload);
    const offers: NormalizedOffer[] = [];

    parsed.rows.forEach((row, index) => {
      const validated = validateRow(row, index + 1, parsed.lineNumbers[index] ?? index + 2, {
        defaultSource: "CSV",
      });
      if (validated.offer) offers.push(validated.offer);
    });

    return offers.slice(0, options.limit ?? offers.length);
  },
};

export const CONNECTORS: OfferConnector[] = [manualConnector, csvConnector, ...NETWORK_CONNECTORS];

export function getConnector(id: string): OfferConnector | null {
  return CONNECTORS.find((connector) => connector.id === id) ?? null;
}

export interface ConnectorSummary {
  connector: OfferConnector;
  status: ReturnType<OfferConnector["status"]>;
}

export function connectorSummaries(): ConnectorSummary[] {
  return CONNECTORS.map((connector) => ({ connector, status: connector.status() }));
}

export function readyConnectorIds(): string[] {
  return CONNECTORS.filter((connector) => connector.status().state === "ready").map(
    (connector) => connector.id,
  );
}
