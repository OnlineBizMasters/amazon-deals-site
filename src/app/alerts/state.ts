/**
 * Form state shared by the alert server action and its client form. Kept out of
 * the `"use server"` module because those files may only export async functions.
 */
export interface AlertFormState {
  status: "idle" | "success" | "error";
  message: string | null;
  /** Whether notifications could actually be delivered, reported honestly. */
  deliveryConfigured: boolean;
  deliveryNote: string | null;
  fieldErrors: Record<string, string>;
}

export const initialAlertState: AlertFormState = {
  status: "idle",
  message: null,
  deliveryConfigured: false,
  deliveryNote: null,
  fieldErrors: {},
};
