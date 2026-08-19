export interface DealFormState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
}

export const initialDealFormState: DealFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};
