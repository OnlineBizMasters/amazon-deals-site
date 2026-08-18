import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, createSessionCookie, verifySessionCookie } from "./admin";

/**
 * Server-side session helpers for the admin area. Kept separate from
 * `admin.ts` so the cryptography stays importable from `proxy.ts`, which must not
 * pull in `next/headers`.
 */

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionCookie(store.get(ADMIN_COOKIE)?.value);
}

/** Guards a server component or action; redirects to the login page when absent. */
export async function requireAdmin(returnTo?: string): Promise<void> {
  if (await isAdminAuthenticated()) return;
  const target = returnTo ? `/admin/login?next=${encodeURIComponent(returnTo)}` : "/admin/login";
  redirect(target);
}

export async function startAdminSession(): Promise<void> {
  const { value, maxAge } = await createSessionCookie();
  const store = await cookies();
  store.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
