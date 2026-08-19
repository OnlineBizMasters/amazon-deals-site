import { notFound, permanentRedirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getDealBySlug, getDealBySourceExternalId } from "@/lib/repos/deals";

/**
 * Legacy product URLs from the Amazon-only version of this project.
 *
 * The sample catalogue was migrated into the deal engine with `legacy:<id>`
 * external ids, so these URLs still resolve and redirect permanently to the
 * equivalent deal page instead of 404ing.
 */

export const dynamic = "force-dynamic";

export default async function LegacyProductPage({ params }: PageProps<"/product/[id]">) {
  const { id } = await params;
  const db = getDb();

  const deal =
    getDealBySourceExternalId("AMAZON", `legacy:${id}`, db) ?? getDealBySlug(id, db);

  if (!deal) notFound();

  permanentRedirect(`/deal/${deal.slug}`);
}
