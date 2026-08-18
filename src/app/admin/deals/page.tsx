import Link from "next/link";
import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import { AdminPanel, AdminTable } from "@/components/admin/StatCard";
import { getDb, sweepExpiredDeals } from "@/lib/db/client";
import { countDeals, listDeals, type DealQuery, type DealSort } from "@/lib/repos/deals";
import { listMerchants } from "@/lib/repos/merchants";
import { isDealStatus, isDealType, isOfferSource } from "@/lib/domain/types";
import { requireAdmin } from "@/lib/auth/session";
import { discountLabel, expiryLabel, formatDate } from "@/lib/utils/format";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { verifyDealAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Deals", robots: { index: false, follow: false } };

const PAGE_SIZE = 40;

export default async function AdminDealsPage({ searchParams }: PageProps<"/admin/deals">) {
  await requireAdmin("/admin/deals");

  const params = await searchParams;
  const single = (key: string): string | undefined => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first?.trim() || undefined;
  };

  const statusRaw = single("status");
  const typeRaw = single("type");
  const sourceRaw = single("source");
  const sortRaw = single("sort") as DealSort | undefined;
  const page = Math.max(1, Number.parseInt(single("page") ?? "1", 10) || 1);

  const query: DealQuery = {
    q: single("q"),
    status: statusRaw && isDealStatus(statusRaw) ? statusRaw : "ALL",
    type: typeRaw && isDealType(typeRaw) ? typeRaw : undefined,
    source: sourceRaw && isOfferSource(sourceRaw) ? sourceRaw : undefined,
    merchantSlug: single("merchant"),
    verifiedOnly: single("verified") === "1" || undefined,
    endingWithinDays: single("ending") === "1" ? 3 : undefined,
    sort: sortRaw ?? "newest",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const db = getDb();
  sweepExpiredDeals(db);

  const deals = listDeals(query, db);
  const total = countDeals({ ...query, limit: undefined, offset: undefined }, db);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const merchants = listMerchants({ status: "ALL", sort: "name", limit: 1000 }, db);

  const pageHref = (nextPage: number): string => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (first) search.set(key, first);
    }
    search.set("page", String(nextPage));
    return `/admin/deals?${search.toString()}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Deals</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total.toLocaleString("en-US")} offer(s) match the current filters.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/deals/new" className={primaryButtonClass}>
            New deal
          </Link>
          <Link href="/admin/imports" className={secondaryButtonClass}>
            Import CSV
          </Link>
        </div>
      </header>

      {params.deleted && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Deal deleted.
        </p>
      )}

      <form
        action="/admin/deals"
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input
          type="search"
          name="q"
          defaultValue={single("q") ?? ""}
          placeholder="Search title, code, merchant…"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 lg:col-span-2"
        />
        <select
          name="status"
          defaultValue={statusRaw ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Any status</option>
          {["ACTIVE", "EXPIRED", "PENDING", "DISABLED"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={typeRaw ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Any type</option>
          <option value="PROMO_CODE">Promo codes</option>
          <option value="DEAL">Deals</option>
        </select>
        <select
          name="merchant"
          defaultValue={single("merchant") ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Any merchant</option>
          {merchants.map((merchant) => (
            <option key={merchant.slug} value={merchant.slug}>
              {merchant.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sortRaw ?? "newest"}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="best">Deal Score</option>
          <option value="popular">Most clicked</option>
          <option value="expiring">Expiring soonest</option>
          <option value="discount">Biggest discount</option>
          <option value="recently_verified">Recently verified</option>
        </select>
        <div className="flex flex-wrap items-center gap-4 lg:col-span-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="verified"
              value="1"
              defaultChecked={single("verified") === "1"}
              className="h-4 w-4 accent-brand-600"
            />
            Verified only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="ending"
              value="1"
              defaultChecked={single("ending") === "1"}
              className="h-4 w-4 accent-brand-600"
            />
            Ending within 3 days
          </label>
        </div>
        <div className="flex gap-2 lg:col-span-2">
          <button type="submit" className={secondaryButtonClass}>
            Apply filters
          </button>
          <Link href="/admin/deals" className="self-center text-sm font-semibold text-slate-500">
            Reset
          </Link>
        </div>
      </form>

      <AdminPanel title="Offers">
        {deals.length === 0 ? (
          <p className="text-sm text-slate-500">No offers match these filters.</p>
        ) : (
          <AdminTable
            headers={["Offer", "Merchant", "Discount", "Expiry", "Status", "Score", "Clicks", "Actions"]}
          >
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td className="px-5 py-2">
                  <Link
                    href={`/admin/deals/${deal.id}`}
                    className="font-medium text-slate-800 hover:text-brand-700"
                  >
                    {deal.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <Badge tone={deal.type === "PROMO_CODE" ? "brand" : "neutral"}>
                      {deal.type === "PROMO_CODE" ? deal.couponCode ?? "CODE" : "Deal"}
                    </Badge>
                    <Badge tone="neutral">{deal.source}</Badge>
                    {deal.featured && <Badge tone="brand">Featured</Badge>}
                    {deal.trending && <Badge tone="urgent">Trending</Badge>}
                    {deal.isDemo && <Badge tone="demo">Sample</Badge>}
                  </div>
                </td>
                <td className="px-5 py-2 text-slate-600">{deal.merchant.name}</td>
                <td className="px-5 py-2 text-slate-600">{discountLabel(deal) ?? "—"}</td>
                <td className="px-5 py-2 text-slate-600">
                  {deal.expiresAt ? (
                    <span title={formatDate(deal.expiresAt) ?? undefined}>
                      {expiryLabel(deal.expiresAt)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-2">
                  <Badge
                    tone={
                      deal.status === "ACTIVE"
                        ? "savings"
                        : deal.status === "PENDING"
                          ? "urgent"
                          : "warning"
                    }
                  >
                    {deal.status}
                  </Badge>
                  {deal.verified && (
                    <Badge tone="verified" className="ml-1">
                      ✓
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-2 font-semibold text-slate-800">{deal.score}</td>
                <td className="px-5 py-2 text-slate-600">
                  {deal.clickCount.toLocaleString("en-US")}
                </td>
                <td className="px-5 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/deals/${deal.id}`}
                      className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={verifyDealAction}>
                      <input type="hidden" name="id" value={deal.id} />
                      <input type="hidden" name="verified" value={deal.verified ? "0" : "1"} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-slate-600 hover:underline"
                      >
                        {deal.verified ? "Unverify" : "Verify"}
                      </button>
                    </form>
                    <Link
                      href={`/admin/deals/${deal.id}#content`}
                      className="text-xs font-semibold text-slate-600 hover:underline"
                    >
                      Content
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={secondaryButtonClass}>
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className={secondaryButtonClass}>
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </AdminPanel>
    </div>
  );
}
