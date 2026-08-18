import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { getDealById, getDealBySlug } from "@/lib/repos/deals";
import { recordClick } from "@/lib/repos/clicks";
import { resolveOutboundUrl } from "@/lib/services/affiliate";

/**
 * Tracked affiliate redirect: `/go/[dealId]?src=youtube`.
 *
 * Validates the deal, records the click (deal, merchant, campaign `src`, channel
 * and referrer hostname only), then redirects to the affiliate URL, falling back
 * to the plain destination URL when no affiliate link is available. Credentials
 * such as the Amazon Associates tag are read from the environment inside
 * `resolveOutboundUrl` and never exposed to the client.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext<"/go/[id]">) {
  const { id } = await context.params;
  const db = getDb();

  // Accept an id or a slug so links stay usable if a slug is shared by mistake.
  const deal = getDealById(id, db) ?? getDealBySlug(id, db);

  if (!deal) {
    return NextResponse.redirect(new URL("/?unavailable=1", request.url), { status: 302 });
  }

  // Expired, pending and disabled offers must not send traffic to the merchant;
  // the deal page explains the current status instead.
  if (deal.status !== "ACTIVE") {
    return NextResponse.redirect(new URL(`/deal/${deal.slug}`, request.url), { status: 302 });
  }

  const src = request.nextUrl.searchParams.get("src");

  try {
    recordClick(
      {
        dealId: deal.id,
        merchantId: deal.merchantId,
        src,
        referrer: request.headers.get("referer"),
        selfHost: request.nextUrl.hostname,
      },
      db,
    );
  } catch (error) {
    // A logging failure must never block the visitor from reaching the merchant.
    console.error("Failed to record click", error);
  }

  const outbound = resolveOutboundUrl(deal, deal.merchant);

  const response = NextResponse.redirect(outbound.url, { status: 302 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  // Keep the referrer off the merchant's side and mark the hop as sponsored.
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
