# DealScout

**Verified deals. Less searching. More saving.**

DealScout is a merchant-independent coupon, promo code and deal engine. Offers are
imported from any source, normalised and de-duplicated, expired automatically,
ranked by a Deal Score, published on SEO-friendly merchant and deal pages, and
sent out through a tracked affiliate redirect that records clicks.

Amazon is treated as one merchant among many. Nothing in the engine assumes a
single retailer, and no external API credentials are required to run it.

## What works today

| Area | Status |
| --- | --- |
| SQLite storage with versioned migrations | Working |
| Merchants, deals, clicks, feedback, submissions, alerts, import history | Working |
| Public site: homepage, search, merchant pages, deal pages, stores, categories | Working |
| Get Code flow: reveal, copy, tracked hand-off, "did this work?" feedback | Working |
| Tracked `/go/[dealId]` redirect with campaign attribution | Working |
| Admin dashboard, merchant/deal CRUD, verification, featured/trending flags | Working |
| CSV / delimited feed import with preview, validation and duplicate detection | Working |
| Automatic expiration (lazy, CLI and cron endpoint) | Working |
| Deal Score and Content Potential ranking | Working |
| Social content generator (YouTube, Shorts, TikTok, Facebook Reels) | Working |
| Visitor coupon submissions with admin approval | Working |
| Deal alert rules and matching logic | Working (delivery not configured — see below) |
| SEO: metadata, canonical URLs, sitemap, robots, Open Graph, JSON-LD | Working |
| CJ, Awin, Impact, Rakuten, Partnerize, Amazon PA-API, direct feed connectors | **Interface only** — see [Connectors](#connectors) |
| Automated offer verification | **Not implemented** — verification is manual |
| Email delivery for deal alerts | **Not implemented** — rules are stored, nothing is sent |

## Running it

Requires Node.js 20.9+ (developed on Node 22).

```bash
npm ci                # install exact dependencies
cp .env.example .env.local   # optional — the defaults work as-is
npm run dev           # http://localhost:3000
```

On first run the database is created at `.data/dealscout.db`, migrations are
applied, and a demo catalogue is seeded (14 merchants, 41 offers, clicks and
feedback). Every seeded record is flagged `is_demo` and labelled **Sample data**
in the UI; sample coupon codes are prefixed `DEMO-` so they cannot be mistaken
for real offers.

Sign in to the admin dashboard at [/admin](http://localhost:3000/admin). With no
`ADMIN_PASSWORD` set, development accepts **`dealscout-dev`** and shows a warning
banner. In production the dashboard is disabled until `ADMIN_PASSWORD` is set.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | Vitest suite (183 tests) |
| `npm run db:status` | Print a summary of what is stored |
| `npm run db:seed` | Seed the demo catalogue into an empty database |
| `npm run db:seed -- --force` | Remove demo records and re-seed them |
| `npm run db:reset` | Delete everything and re-seed |
| `npm run deals:expire` | Run the expiration sweep and recompute Deal Scores |

### Removing the demo data

```bash
npm run db:reset          # start clean, then re-seed demo data
DEALSCOUT_AUTO_SEED=0 npm run dev    # never seed
```

To keep real offers and drop only samples, use `npm run db:seed -- --force` before
adding your own, or delete the sample merchants from Admin → Merchants.

## Architecture

```
src/
  app/
    page.tsx                  Homepage sections
    search/                   Search and filters (URL-driven)
    coupons/[slug]/           Merchant pages
    deal/[slug]/              Deal pages
    stores/ categories/       Directory pages
    go/[id]/route.ts          Tracked affiliate redirect
    submit-coupon/ alerts/    Visitor forms (server actions)
    affiliate-disclosure/ privacy/ terms/
    sitemap.ts robots.ts
    api/deals, api/deals/[id]/feedback, api/products (legacy), api/cron/expire
    admin/                    Protected dashboard
  proxy.ts                    Admin gate (Next 16 replacement for middleware)
  lib/
    domain/types.ts           Merchants, deals, statuses, sources, channels
    db/                       Connection, migrations, row mappers
    repos/                    Merchants, deals, clicks, feedback, submissions,
                              alerts, imports, stats
    services/                 deal-score, video-score, expiration, verification,
                              affiliate, analytics-channels
    import/                   csv, normalize, validate, dedupe, engine
    connectors/               Connector contract, network declarations, registry
    content/generate.ts       Social content templates
    queries/                  Homepage and search composition
    seo/                      JSON-LD builders
    seed/                     Demo catalogue
  components/                 deals, merchants, search, site, admin, ui
tests/                        Vitest suites
scripts/                      db.ts, expire.ts
```

### Data model

**Merchant** — id, name, slug, logo, websiteUrl, affiliateBaseUrl, description,
category, status, featured, qualityScore, network, createdAt, updatedAt.

**Deal** — id, merchantId, title, slug, description, type (`PROMO_CODE` | `DEAL`),
couponCode, destinationUrl, affiliateUrl, originalPrice, salePrice,
discountPercent, discountAmount, currency, startDate, expiresAt, verified,
lastVerifiedAt, status (`ACTIVE` | `EXPIRED` | `DISABLED` | `PENDING`), source,
sourceExternalId, featured, trending, clickCount, workedYes/workedNo, category,
terms, isDemo, score, createdAt, updatedAt.

**Sources** — `MANUAL`, `CSV`, `CJ`, `AWIN`, `IMPACT`, `RAKUTEN`, `PARTNERIZE`,
`AMAZON`, `DIRECT`, `USER_SUBMISSION`. Adding one means appending to
`OFFER_SOURCES` and registering a connector; nothing else changes.

Supporting tables: `clicks`, `deal_feedback`, `deal_submissions`, `deal_alerts`,
`import_batches`, `app_meta`, `_migrations`.

Storage is SQLite via `better-sqlite3`, behind a repository layer. Indexes cover
status, expiry, merchant, category, source, score and click count, and a partial
unique index enforces one deal per `(source, sourceExternalId)`. Because every
query goes through the repositories, moving to Postgres means reimplementing that
layer rather than touching the UI.

## Import engine

Import is two explicit steps. `planImportFromCsv` parses, normalises, validates
and duplicate-checks **without writing anything**; `commitImport` applies a plan in
one transaction. Both are reused by CSV uploads and, in future, by network
connectors — anything that can produce `NormalizedOffer` rows inherits the whole
pipeline.

Recognised columns: `merchant`, `title`, `description`, `coupon_code`, `deal_type`,
`destination_url`, `affiliate_url`, `original_price`, `sale_price`,
`discount_percent`, `discount_amount`, `currency`, `start_date`,
`expiration_date`, `source`, `external_id`, `category`, `terms`,
`merchant_website`, `verified`. Only `merchant`, `title` and `destination_url` are
required.

Common aliases are mapped automatically (`store`/`advertiser`/`brand` →
`merchant`, `code`/`voucher_code` → `coupon_code`, `tracking_url` →
`affiliate_url`, `valid_to` → `expiration_date`, and more). Comma, semicolon, tab
and pipe delimiters are detected; prices accept `$1,299.00` and `1.299,00`; dates
accept `YYYY-MM-DD`, `MM/DD/YYYY` and ISO timestamps. A date-only expiry becomes
end-of-day UTC so an offer stays live through its final day.

Duplicate detection, in order of confidence:

1. **source + external ID** — the same feed record, so it is *updated* in place.
2. **merchant + coupon code** — skipped.
3. **merchant + destination URL** — skipped (protocol, `www.` and query strings
   ignored when comparing).
4. **merchant + type + near-identical title** on a live deal — skipped at 82%+
   token overlap.

Rows that duplicate each other inside one file are caught before the database is
touched. Every batch is recorded in import history with a per-row report, and dry
runs are supported.

## Ranking

**Deal Score (0-100)** is a weighted sum of independent signals in
`src/lib/services/deal-score.ts`: discount strength (26), verification recency
(18), freshness (14), engagement (14), worked-feedback (10), expiry urgency (8),
merchant quality (6) and editorial flags (4). Signals with no stored data are
excluded from both numerator and denominator, so a sparse record scores on the
evidence that exists instead of being penalised for absent fields; the admin panel
reports the resulting evidence coverage. The score is persisted so listings rank in
SQL, and recomputed on write, after imports and during the expiration sweep.

**Content Potential (0-100)** in `src/lib/services/video-score.ts` ranks offers as
raw material for short-form content: discount strength, genuine urgency,
freshness, existing engagement, feedback and whether enough structured detail is
stored to write an honest script. It is deliberately named *Content Potential* /
*Viral candidate* — it ranks stored signals and never claims anything is viral.

**Trending** is shown publicly only when an administrator sets the flag or the
deal has real recorded click volume with non-negative feedback.

## Expiration

An `ACTIVE` deal whose `expiresAt` has passed becomes `EXPIRED`. Nothing is
deleted — expired rows stay for analytics and history, and are excluded from
active listings. If an expiry is later extended, the deal is restored to `ACTIVE`.

The sweep runs three ways: lazily on public read paths (throttled to once a
minute), via `npm run deals:expire`, and via `POST /api/cron/expire` for a
scheduler:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/expire
```

## Verification

Verification is **manual** in this release. An editor marks an offer verified and
the timestamp is stored; the UI always shows the date it was checked and never
implies a live check. `AutomatedVerifier` in
`src/lib/services/verification.ts` is the seam for future automation through
legitimate merchant or network APIs — no implementation ships, and
`automatedVerificationAvailable()` returns `false`.

Visitor Yes/No votes are stored as a quality signal that feeds the Deal Score and
the admin review queue. They never set the verified flag.

## Click tracking and analytics

`/go/[dealId]?src=youtube` validates the deal, records the click, and redirects to
the affiliate URL (falling back to the merchant deep-link template, then an Amazon
Associates tag, then the plain destination). Raw affiliate URLs are never rendered
in the page, and inactive offers redirect to the deal page rather than to the
merchant.

Each click stores the deal, the merchant, the campaign `src` value, a coarse
channel and the referrer *hostname*. No IP address, user agent, cookie or full
referrer URL is stored. Admin → Analytics compares YouTube, TikTok, Facebook,
Instagram, Pinterest, email, SEO/direct and other traffic, plus per-`src` and
per-source performance.

## Content generator

Admin → Deals → *Generate Content* produces templates for YouTube (titles, long
description, CTA, hashtags, keywords, thumbnail text), YouTube Shorts (hook, timed
15-30s script, caption, hashtags), TikTok (hook, caption, SEO description,
hashtags, cover text) and Facebook Reels (title, caption, CTA, hashtags, cover
text).

Templates are assembled **only** from fields stored on the deal and merchant.
There is no model call. If a price, discount, code or expiry is missing, that line
is omitted rather than filled in — prices, ratings, review counts, features and
expiry dates are never invented. The studio lists the facts used, the fields that
are missing, and warnings such as discount-led titles going stale before the
stored expiry. Tests assert the absence of fabricated ratings, review counts and
stock claims.

## Connectors

`src/lib/connectors/` defines one contract: a connector returns
`NormalizedOffer[]`, which flows through the same validation, duplicate detection
and commit path as a CSV upload.

- **Working now:** manual entry (admin UI) and CSV / delimited feed text.
- **Interface only:** CJ, Awin, Impact, Rakuten Advertising, Partnerize, Amazon
  PA-API and direct merchant feeds.

Each declared network lists the credentials it genuinely requires and links to its
official documentation. None contains an invented endpoint or makes any request:
calling `fetchOffers()` throws `ConnectorNotConfiguredError` when credentials are
missing and `ConnectorNotImplementedError` when they are present but no client
exists. Admin → Connectors shows the state of each. Nothing degrades when they are
unconfigured — the engine runs on manual and CSV sources.

DealScout does not scrape sites. Only APIs, feeds, files and manually supplied
data you are authorised to use are supported.

## Deal alerts

Visitors can follow a store, a category, a minimum discount, or any combination
(for example Amazon + Electronics + 30%+). Rules are stored and
`matchingAlerts()` resolves which subscriptions a new offer satisfies.

**No email is sent.** There is no transport in this release, so subscriptions are
created with status `PENDING_DELIVERY_SETUP`, and both the public form and the
admin page state plainly that delivery requires provider configuration. Setting
`EMAIL_PROVIDER`, `EMAIL_API_KEY` and `EMAIL_FROM_ADDRESS` marks the provider as
present; a transport still has to be implemented in `src/lib/repos/alerts.ts`.

## SEO

Dynamic per-page metadata, canonical URLs, Open Graph and Twitter tags, a
generated sitemap and a robots policy. JSON-LD covers `WebSite`,
`BreadcrumbList`, `CollectionPage`/`ItemList` for merchants and `ItemPage`/`Offer`
for deals, emitting only fields that are actually stored.

Thin pages are kept out of the index deliberately: merchant pages with no active
offers and non-active deal pages are `noindex, follow`, filtered `/search` results
are not indexed, and the sitemap lists only merchants with live offers and
`ACTIVE` deals. Until `SITE_URL` is configured, `robots.txt` disallows everything
so previews and local runs are never crawled.

## Trust and compliance

`/affiliate-disclosure`, `/privacy` and `/terms` state that DealScout may earn
commissions from qualifying purchases, that prices and availability change, that
coupon codes expire, and that merchants control final pricing and eligibility.

The engine will not invent urgency. No countdown, stock level or purchase count is
ever displayed, expiry messaging appears only when a date is stored, and
"Verified" is shown only when the database says so — always with the date of the
check.

## Legacy compatibility

This project began as an Amazon-only product catalogue. That work is preserved:
the sample products were migrated into the deal engine as Amazon demo offers with
`legacy:` external ids, `/product/[id]` permanently redirects to the equivalent
`/deal/[slug]`, and `/api/products` still responds (now backed by the deal engine,
marked deprecated, pointing at `/api/deals`).

## Tests

```bash
npm test
```

183 tests over 10 suites, using in-memory SQLite: CSV parsing (quoted fields,
embedded newlines, BOM, delimiter detection), field normalisation, row validation,
the import engine and all four duplicate strategies, Deal Score and Content
Potential behaviour, expiration transitions, content generation (asserting nothing
is fabricated and missing fields are omitted), repositories, search parameter
parsing, seed integrity, and connector states.

## Deployment notes

- The app is dynamic: offer data changes constantly, so pages are rendered per
  request rather than prerendered.
- SQLite needs a writable, persistent disk at `DATABASE_PATH`. On platforms with
  ephemeral filesystems, mount a volume or swap the repository layer for a hosted
  database.
- Set `ADMIN_PASSWORD` and `SITE_URL` before going live, and schedule
  `POST /api/cron/expire` with `CRON_SECRET`.
