import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionCookie } from "@/lib/auth/admin";

/**
 * Gate for the admin area.
 *
 * Only the signed session cookie is inspected here — no database access — so the
 * check stays cheap. Pages and server actions call `requireAdmin()` as well, so
 * authorisation is enforced even if a request bypasses this layer.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const authenticated = await verifySessionCookie(request.cookies.get(ADMIN_COOKIE)?.value);
  if (authenticated) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
