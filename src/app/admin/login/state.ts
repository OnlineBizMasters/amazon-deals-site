export interface LoginState {
  status: "idle" | "error";
  message: string | null;
}

export const initialLoginState: LoginState = { status: "idle", message: null };
