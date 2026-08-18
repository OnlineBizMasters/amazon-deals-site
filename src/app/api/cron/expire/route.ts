import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { runExpirationSweep } from "@/lib/services/expiration";
import { recomputeAllDealScores } from "@/lib/repos/deals";
import { isAdminAuthenticated } from "@/lib/auth/session";

/**
 * Scheduled expiration sweep, for a cron job or platform scheduler:
 *
 *   POST /api/cron/expire   with   Authorization: Bearer $CRON_SECRET
 *
 * When `CRON_SECRET` is not set the endpoint accepts an authenticated admin
 * session instead, so it stays usable in development without a shared secret —
 * but it is never open to anonymous callers.
 */

export const dynamic = "force-dynamic";

async function authorize(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET?.trim();

  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
    const queryToken = request.nextUrl.searchParams.get("token");
    if (bearer === secret || queryToken === secret) return true;
  }

  return isAdminAuthenticated();
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json(
      {
        error: "Not authorised",
        hint: "Set CRON_SECRET and send it as a Bearer token, or call this while signed in as an admin.",
      },
      { status: 401 },
    );
  }

  const db = getDb();
  const sweep = runExpirationSweep(db);
  const rescored = recomputeAllDealScores(db);

  return NextResponse.json(
    { ...sweep, rescored },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** GET reports what a sweep would do without changing anything. */
export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const db = getDb();
  const pending = db
    .prepare<unknown[], { count: number }>(
      `SELECT COUNT(*) AS count FROM deals
        WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at < ?`,
    )
    .get(new Date().toISOString());

  return NextResponse.json(
    {
      wouldExpire: pending?.count ?? 0,
      note: "Send a POST request to run the sweep.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
