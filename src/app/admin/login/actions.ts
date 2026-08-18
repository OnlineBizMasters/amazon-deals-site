"use server";

import { redirect } from "next/navigation";
import { adminAuthConfig, verifyPassword } from "@/lib/auth/admin";
import { endAdminSession, startAdminSession } from "@/lib/auth/session";
import type { LoginState } from "./state";

/** Exchanges the shared admin password for a signed session cookie. */
export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  const config = adminAuthConfig();
  if (!config.configured) {
    return {
      status: "error",
      message:
        config.reason ??
        "Admin access is not configured. Set ADMIN_PASSWORD in the environment and restart.",
    };
  }

  if (!(await verifyPassword(password))) {
    return { status: "error", message: "Incorrect password." };
  }

  await startAdminSession();

  // Only allow same-origin destinations, so `?next=` cannot be used for redirects
  // to another site.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}
