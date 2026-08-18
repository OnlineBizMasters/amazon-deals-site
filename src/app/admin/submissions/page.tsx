import Link from "next/link";
import type { Metadata } from "next";
import Badge from "@/components/ui/Badge";
import { AdminPanel } from "@/components/admin/StatCard";
import { getDb } from "@/lib/db/client";
import { listSubmissions } from "@/lib/repos/submissions";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { inputClass, primaryButtonClass, dangerButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { isSubmissionStatusParam } from "./filters";
import { approveSubmissionAction, rejectSubmissionAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Submissions", robots: { index: false, follow: false } };

export default async function AdminSubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  await requireAdmin("/admin/submissions");

  const params = await searchParams;
  const statusRaw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = isSubmissionStatusParam(statusRaw) ? statusRaw : "PENDING";

  const submissions = listSubmissions({ status, limit: 100 }, getDb());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Visitor submissions
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Nothing here is public. Approving a submission creates an offer attributed to the
          user-submission source; it is <strong>not</strong> marked verified automatically.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((option) => (
          <Link
            key={option}
            href={`/admin/submissions?status=${option}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              option === status
                ? "bg-brand-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-brand-400"
            }`}
          >
            {option}
          </Link>
        ))}
      </div>

      {submissions.length === 0 ? (
        <AdminPanel title="Nothing to review">
          <p className="text-sm text-slate-500">
            No submissions with that status. The public form lives at{" "}
            <Link href="/submit-coupon" className="font-semibold text-brand-700">
              /submit-coupon
            </Link>
            .
          </p>
        </AdminPanel>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{submission.merchantName}</h2>
                    {submission.couponCode && (
                      <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs text-white">
                        {submission.couponCode}
                      </span>
                    )}
                    <Badge
                      tone={
                        submission.status === "PENDING"
                          ? "urgent"
                          : submission.status === "APPROVED"
                            ? "savings"
                            : "warning"
                      }
                    >
                      {submission.status}
                    </Badge>
                    {!submission.merchantId && <Badge tone="brand">new merchant</Badge>}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-slate-700">{submission.description}</p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                    <div>
                      <dt className="inline font-semibold">Destination: </dt>
                      <dd className="inline break-all">
                        <a
                          href={submission.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-brand-700 hover:underline"
                        >
                          {submission.destinationUrl}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Expiry given: </dt>
                      <dd className="inline">
                        {submission.expiresAt ? formatDate(submission.expiresAt) : "none"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Submitted: </dt>
                      <dd className="inline">{formatDateTime(submission.createdAt)}</dd>
                    </div>
                    {submission.reviewedAt && (
                      <div>
                        <dt className="inline font-semibold">Reviewed: </dt>
                        <dd className="inline">{formatDateTime(submission.reviewedAt)}</dd>
                      </div>
                    )}
                  </dl>
                  {submission.reviewerNotes && (
                    <p className="mt-2 text-xs text-slate-600">
                      Reviewer notes: {submission.reviewerNotes}
                    </p>
                  )}
                </div>

                {submission.createdDealId && (
                  <Link
                    href={`/admin/deals/${submission.createdDealId}`}
                    className={secondaryButtonClass}
                  >
                    View created deal
                  </Link>
                )}
              </div>

              {submission.status === "PENDING" && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end">
                  <form action={approveSubmissionAction} className="flex flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={submission.id} />
                    <label className="flex-1 text-xs font-semibold text-slate-700">
                      Review notes (optional)
                      <input name="notes" className={`${inputClass} mt-1`} />
                    </label>
                    <button type="submit" className={primaryButtonClass}>
                      Approve &amp; create offer
                    </button>
                  </form>

                  <form action={rejectSubmissionAction}>
                    <input type="hidden" name="id" value={submission.id} />
                    <button type="submit" className={dangerButtonClass}>
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
