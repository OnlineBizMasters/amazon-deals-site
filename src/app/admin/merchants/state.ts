export interface MerchantFormState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Record<string, string>;
}

export const initialMerchantFormState: MerchantFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};
