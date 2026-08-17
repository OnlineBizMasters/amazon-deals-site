# amazon-deals-site

Amazon affiliate product discovery and deals website for US shoppers.

**DealScout** is a [Next.js](https://nextjs.org) (App Router) storefront that lets
US shoppers discover hand-picked Amazon deals. Visitors can search, filter by
category, sort by discount/price/rating, and click through to a product detail
page with an affiliate link to Amazon.

> This is a demo storefront and is not affiliated with Amazon. Product data is
> sample data defined in `src/lib/products.ts`.

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS v4**
- **ESLint** (`eslint-config-next`)

## Getting started

```bash
npm ci          # install exact dependencies from package-lock.json
npm run dev      # start the dev server on http://localhost:3000
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the development server (hot reload)    |
| `npm run build` | Production build                             |
| `npm start`     | Serve the production build                   |
| `npm run lint`  | Run ESLint                                   |

## Configuration

| Env var                | Default        | Description                                              |
| ---------------------- | -------------- | -------------------------------------------------------- |
| `AMAZON_AFFILIATE_TAG` | `dealsforus-20`| Amazon Associates tag appended to outbound product links |

## Project structure

```
src/
  app/
    api/products/route.ts   # JSON search/filter API used by the deals explorer
    product/[id]/page.tsx    # product detail page + affiliate link
    page.tsx                 # home page (hero + deals explorer)
    layout.tsx               # header/footer shell
  components/                # ProductCard, DealsExplorer, StarRating, header/footer
  lib/products.ts            # product data, search/sort, affiliate URL helper
```

## API

`GET /api/products` supports the following query parameters:

- `q` — free-text search across title, blurb, category, and features
- `category` — one of the categories in `src/lib/products.ts` (or `All`)
- `sort` — `discount` | `price-asc` | `price-desc` | `rating`
- `minDiscount` — minimum discount percentage (e.g. `40`)
