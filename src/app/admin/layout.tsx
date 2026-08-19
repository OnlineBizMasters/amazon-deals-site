import Link from "next/link";
import type { Metadata } from "next";
import AdminNav from "@/components/admin/AdminNav";
import { getDb } from "@/lib/db/client";
import { countSubmissions } from "@/lib/repos/submissions";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { adminAuthConfig } from "@/lib/auth/admin";
import { logoutAction } from "./login/actions";
import { secondaryButtonClass } from "@/components/ui/form";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: `%s | ${SITE.name} admin` },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const authenticated = await isAdminAuthenticated();

  // The login screen renders inside this layout but without the chrome.
  if (!authenticated) {
    return <>{children}</>;
  }

  const config = adminAuthConfig();
  const pendingSubmissions = countSubmissions("PENDING", getDb());

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-base font-extrabold tracking-tight text-slate-900">
                {SITE.name} <span className="text-brand-600">admin</span>
              </Link>
              <span className="hidden text-xs text-slate-500 sm:inline">
                Merchant-independent coupon &amp; deal engine
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/" className={secondaryButtonClass} target="_blank" rel="noopener">
                View site
              </Link>
              <form action={logoutAction}>
                <button type="submit" className={secondaryButtonClass}>
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <div className="pb-2">
            <AdminNav pendingSubmissions={pendingSubmissions} />
          </div>
        </div>
      </div>

      {config.usingDevFallback && (
        <p className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          {config.reason}
        </p>
      )}

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
