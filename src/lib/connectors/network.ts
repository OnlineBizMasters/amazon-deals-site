import {
  ConnectorNotConfiguredError,
  ConnectorNotImplementedError,
  missingEnvVars,
  networkConnectorStatus,
  type OfferConnector,
} from "./types";
import type { NormalizedOffer } from "../import/validate";
import type { OfferSource } from "../domain/types";

/**
 * Declarations for affiliate network connectors.
 *
 * Each entry records the credentials the network genuinely requires and what is
 * left to build. `fetchOffers` throws rather than returning invented data, and no
 * endpoint URLs are guessed — the real request shape must come from the network's
 * own documentation once an account exists.
 */

interface NetworkConnectorSpec {
  id: string;
  label: string;
  source: OfferSource;
  description: string;
  docsUrl: string | null;
  credentials: { env: string; description: string; required: boolean }[];
  integrationNotes: string;
}

const SPECS: NetworkConnectorSpec[] = [
  {
    id: "cj",
    label: "CJ Affiliate",
    source: "CJ",
    description:
      "Imports coupon and promotional offers for advertisers you are joined with on CJ Affiliate, using their publisher API.",
    docsUrl: "https://developers.cj.com/",
    credentials: [
      {
        env: "CJ_PERSONAL_ACCESS_TOKEN",
        description: "CJ personal access token for the publisher account.",
        required: true,
      },
      {
        env: "CJ_PUBLISHER_ID",
        description: "Your CJ publisher (CID) identifier, used in link and query building.",
        required: true,
      },
    ],
    integrationNotes:
      "Needs an approved CJ publisher account. Implement a client for CJ's promotional-properties/link-search endpoints, map their advertiser and coupon fields onto NormalizedOffer, then reuse planImportFromRows and commitImport.",
  },
  {
    id: "awin",
    label: "Awin",
    source: "AWIN",
    description:
      "Imports voucher codes and promotions from Awin advertisers you have an active relationship with.",
    docsUrl: "https://wiki.awin.com/index.php/Publisher_API",
    credentials: [
      {
        env: "AWIN_API_TOKEN",
        description: "Awin publisher API OAuth2 token.",
        required: true,
      },
      {
        env: "AWIN_PUBLISHER_ID",
        description: "Awin publisher account id used in API paths and deep links.",
        required: true,
      },
    ],
    integrationNotes:
      "Needs an approved Awin publisher account. Awin exposes promotions through its publisher API and downloadable promotion feeds; either can be mapped to NormalizedOffer.",
  },
  {
    id: "impact",
    label: "Impact",
    source: "IMPACT",
    description:
      "Imports promo codes and campaign offers from brands you are contracted with on Impact.",
    docsUrl: "https://integrations.impact.com/impact-partner/reference",
    credentials: [
      {
        env: "IMPACT_ACCOUNT_SID",
        description: "Impact partner account SID.",
        required: true,
      },
      {
        env: "IMPACT_AUTH_TOKEN",
        description: "Impact partner auth token (used as HTTP basic auth password).",
        required: true,
      },
    ],
    integrationNotes:
      "Needs an approved Impact partner account. Implement a client for the partner Promotions/Ads endpoints and map campaign, code and landing-page fields onto NormalizedOffer.",
  },
  {
    id: "rakuten",
    label: "Rakuten Advertising",
    source: "RAKUTEN",
    description:
      "Imports coupon and banner offers from Rakuten Advertising advertisers you are approved for.",
    docsUrl: "https://developers.rakutenadvertising.com/",
    credentials: [
      {
        env: "RAKUTEN_CLIENT_ID",
        description: "Rakuten Advertising API client id.",
        required: true,
      },
      {
        env: "RAKUTEN_CLIENT_SECRET",
        description: "Rakuten Advertising API client secret.",
        required: true,
      },
      {
        env: "RAKUTEN_SITE_ID",
        description: "Publisher site id offers should be attributed to.",
        required: true,
      },
    ],
    integrationNotes:
      "Needs an approved Rakuten Advertising publisher account. Implement the OAuth2 token exchange plus their coupon/advertiser endpoints before enabling.",
  },
  {
    id: "partnerize",
    label: "Partnerize",
    source: "PARTNERIZE",
    description: "Imports offers and vouchers from Partnerize brands you are partnered with.",
    docsUrl: "https://developer.partnerize.com/",
    credentials: [
      {
        env: "PARTNERIZE_USER_APPLICATION_KEY",
        description: "Partnerize user application key.",
        required: true,
      },
      {
        env: "PARTNERIZE_USER_API_KEY",
        description: "Partnerize user API key.",
        required: true,
      },
    ],
    integrationNotes:
      "Needs an approved Partnerize partner account. Implement their reporting/offer endpoints and map campaign vouchers onto NormalizedOffer.",
  },
  {
    id: "amazon",
    label: "Amazon (Associates / Product Advertising API)",
    source: "AMAZON",
    description:
      "Treats Amazon as one merchant among many. Outbound Amazon links pick up the Associates tag automatically once it is configured; bulk offer import requires PA-API access.",
    docsUrl: "https://webservices.amazon.com/paapi5/documentation/",
    credentials: [
      {
        env: "AMAZON_ASSOCIATES_TAG",
        description:
          "Associates tracking id. When set, Amazon destination URLs are tagged by the redirect layer. This alone does not enable importing.",
        required: true,
      },
      {
        env: "AMAZON_PAAPI_ACCESS_KEY",
        description: "Product Advertising API access key (required for bulk import only).",
        required: true,
      },
      {
        env: "AMAZON_PAAPI_SECRET_KEY",
        description: "Product Advertising API secret key (required for bulk import only).",
        required: true,
      },
    ],
    integrationNotes:
      "PA-API access requires an Associates account in good standing with qualifying sales. Amazon's terms restrict how long prices may be cached, so a PA-API importer must refresh price data rather than storing it indefinitely.",
  },
  {
    id: "direct",
    label: "Direct merchant feed",
    source: "DIRECT",
    description:
      "For merchants that run their own affiliate programme and publish a coupon feed (CSV, JSON or XML) at a URL you are authorised to fetch.",
    docsUrl: null,
    credentials: [
      {
        env: "DIRECT_FEED_URL",
        description: "Feed URL supplied by the merchant.",
        required: true,
      },
      {
        env: "DIRECT_FEED_AUTH_HEADER",
        description: "Optional Authorization header value if the feed is protected.",
        required: false,
      },
    ],
    integrationNotes:
      "Only fetch feeds you have permission to access. Once the feed shape is known, parse it into NormalizedOffer rows — a CSV feed can be piped straight into planImportFromCsv today.",
  },
];

function buildConnector(spec: NetworkConnectorSpec): OfferConnector {
  return {
    id: spec.id,
    label: spec.label,
    source: spec.source,
    description: spec.description,
    docsUrl: spec.docsUrl,
    credentials: spec.credentials,
    integrationNotes: spec.integrationNotes,
    status: () => networkConnectorStatus({ id: spec.id, label: spec.label, credentials: spec.credentials }),
    async fetchOffers(): Promise<NormalizedOffer[]> {
      const missing = missingEnvVars(spec.credentials);
      if (missing.length > 0) {
        throw new ConnectorNotConfiguredError(spec.id, missing);
      }
      throw new ConnectorNotImplementedError(
        spec.id,
        `${spec.label} requires an API client built against ${
          spec.docsUrl ?? "the merchant's own feed documentation"
        }. Use the CSV importer in the meantime.`,
      );
    },
  };
}

export const NETWORK_CONNECTORS: OfferConnector[] = SPECS.map(buildConnector);
