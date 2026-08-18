"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { approveSubmission, rejectSubmission } from "@/lib/repos/submissions";
import { requireAdmin } from "@/lib/auth/session";

/**
 * Approving a submission creates a real deal attributed to USER_SUBMISSION.
 * It is never verified automatically — an editor must check it separately.
 */
export async function approveSubmissionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  await requireAdmin("/admin/submissions");

  const result = approveSubmission(id, { notes }, getDb());

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/deals");
  revalidatePath("/");

  if (result) redirect(`/admin/deals/${result.dealId}?created=1`);
}

export async function rejectSubmissionAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  await requireAdmin("/admin/submissions");

  rejectSubmission(id, notes, getDb());
  revalidatePath("/admin/submissions");
}
