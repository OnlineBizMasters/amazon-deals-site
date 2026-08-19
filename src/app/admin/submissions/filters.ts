import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/domain/types";

export type SubmissionStatusParam = SubmissionStatus | "ALL";

export function isSubmissionStatusParam(value: unknown): value is SubmissionStatusParam {
  return (
    value === "ALL" ||
    (typeof value === "string" && (SUBMISSION_STATUSES as readonly string[]).includes(value))
  );
}
