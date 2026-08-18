import type { NormalizedOffer } from "../import/validate";
import type { OfferSource } from "../domain/types";

/**
 * Connector contract for pulling offers from an external source.
 *
 * Every connector converts whatever the upstream returns into `NormalizedOffer`
 * objects, which then flow through the same validation, deduplication and commit
 * pipeline as a CSV upload. That keeps one code path for all sources.
 *
 * V1 ships two working connectors (manual entry and CSV/feed text). The affiliate
 * networks are declared with the credentials they will require and report an
 * `unconfigured` state — they contain no invented endpoints and make no requests.
 */

export type ConnectorState = "ready" | "unconfigured" | "not_implemented";

export interface ConnectorCredential {
  /** Environment variable name. Secrets are only ever read from the environment. */
  env: string;
  description: string;
  required: boolean;
}

export interface ConnectorStatus {
  state: ConnectorState;
  /** Human-readable explanation shown in the admin UI. */
  message: string;
  missingEnv: string[];
}

export interface FetchOffersOptions {
  /** Restrict to a single merchant/advertiser identifier, when the API supports it. */
  merchantId?: string;
  /** Only offers updated since this ISO timestamp, when the API supports it. */
  since?: string;
  limit?: number;
  /** Raw payload for connectors that accept supplied data (CSV text, feed body). */
  payload?: string;
}

export interface OfferConnector {
  id: string;
  label: string;
  source: OfferSource;
  /** What this connector does and how offers reach DealScout. */
  description: string;
  /** Official documentation for the upstream API/feed. */
  docsUrl: string | null;
  credentials: ConnectorCredential[];
  /** Notes on what still has to be built before the connector can run. */
  integrationNotes: string;
  status(): ConnectorStatus;
  fetchOffers(options?: FetchOffersOptions): Promise<NormalizedOffer[]>;
}

export class ConnectorNotConfiguredError extends Error {
  constructor(
    public readonly connectorId: string,
    public readonly missingEnv: string[],
  ) {
    super(
      `Connector "${connectorId}" is not configured. Missing environment variable(s): ${
        missingEnv.join(", ") || "none"
      }.`,
    );
    this.name = "ConnectorNotConfiguredError";
  }
}

export class ConnectorNotImplementedError extends Error {
  constructor(
    public readonly connectorId: string,
    public readonly reason: string,
  ) {
    super(`Connector "${connectorId}" has no live integration in this release. ${reason}`);
    this.name = "ConnectorNotImplementedError";
  }
}

export function missingEnvVars(credentials: ConnectorCredential[]): string[] {
  return credentials
    .filter((credential) => credential.required)
    .filter((credential) => !process.env[credential.env]?.trim())
    .map((credential) => credential.env);
}

/**
 * Shared status logic for network connectors: report exactly which credentials
 * are absent, and — when they are all present — state plainly that the transport
 * still has to be written rather than pretending to be ready.
 */
export function networkConnectorStatus(
  connector: Pick<OfferConnector, "id" | "label" | "credentials">,
): ConnectorStatus {
  const missing = missingEnvVars(connector.credentials);
  if (missing.length > 0) {
    return {
      state: "unconfigured",
      message: `Add ${missing.join(", ")} to the environment to configure ${connector.label}.`,
      missingEnv: missing,
    };
  }

  return {
    state: "not_implemented",
    message: `Credentials for ${connector.label} are present, but this release does not include its API client. Imports continue to work through CSV and manual entry.`,
    missingEnv: [],
  };
}
