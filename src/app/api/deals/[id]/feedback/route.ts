import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { getDealById } from "@/lib/repos/deals";
import { recordDealFeedback } from "@/lib/repos/feedback";

/**
 * "Did this code work?" endpoint.
 *
 * Stores a yes/no vote against the deal. The vote feeds ranking and the admin
 * review queue; it never sets the `verified` flag, which stays editorial.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: RouteContext<"/api/deals/[id]/feedback">) {
  const { id } = await context.params;

  let worked: unknown;
  try {
    const body: unknown = await request.json();
    worked = (body as { worked?: unknown } | null)?.worked;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (typeof worked !== "boolean") {
    return NextResponse.json({ error: "`worked` must be true or false" }, { status: 400 });
  }

  const db = getDb();
  const deal = getDealById(id, db);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  recordDealFeedback(deal.id, worked, db);
  const updated = getDealById(deal.id, db);

  return NextResponse.json(
    {
      ok: true,
      dealId: deal.id,
      workedYes: updated?.workedYes ?? 0,
      workedNo: updated?.workedNo ?? 0,
      note: "Feedback is stored as a quality signal. It does not mark the deal verified.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
