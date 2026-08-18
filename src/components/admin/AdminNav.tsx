"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/merchants", label: "Merchants" },
  { href: "/admin/imports", label: "Imports" },
  { href: "/admin/viral-candidates", label: "Content potential" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/alerts", label: "Alerts" },
  { href: "/admin/connectors", label: "Connectors" },
];

export default function AdminNav({ pendingSubmissions }: { pendingSubmissions: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="-mx-4 flex gap-1 overflow-x-auto px-4">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
            {link.href === "/admin/submissions" && pendingSubmissions > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                }`}
              >
                {pendingSubmissions}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
