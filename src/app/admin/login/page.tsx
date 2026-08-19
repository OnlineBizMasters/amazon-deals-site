import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { adminAuthConfig } from "@/lib/auth/admin";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await isAdminAuthenticated()) redirect("/admin");

  const params = await searchParams;
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = nextRaw?.startsWith("/admin") ? nextRaw : "/admin";

  const config = adminAuthConfig();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
          {SITE.name} admin
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in to manage merchants, deals, imports and content.
        </p>

        {!config.configured ? (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-bold">Admin access is not configured</p>
            <p className="mt-1">{config.reason}</p>
          </div>
        ) : (
          <>
            {config.usingDevFallback && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-bold">Development mode</p>
                <p className="mt-1">{config.reason}</p>
              </div>
            )}
            <div className="mt-5">
              <LoginForm next={next} />
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-700">
            ← Back to the public site
          </Link>
        </p>
      </div>
    </main>
  );
}
