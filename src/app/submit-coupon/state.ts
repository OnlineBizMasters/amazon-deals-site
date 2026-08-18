/**
 * Form state shared by the submit-coupon server action and its client form.
 * Kept out of the `"use server"` module because those files may only export
 * async server functions.
 */
export interface SubmitCouponState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
}

export const initialSubmitState: SubmitCouponState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};
