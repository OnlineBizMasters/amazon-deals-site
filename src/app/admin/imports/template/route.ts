import { NextResponse } from "next/server";
import { CSV_TEMPLATE_HEADERS } from "@/lib/import/engine";
import { toCsv } from "@/lib/import/csv";
import { isAdminAuthenticated } from "@/lib/auth/session";

/** Downloadable CSV template with one illustrative row of each offer type. */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const example = [
    [
      "Example Store",
      "20% off full-price items",
      "Sitewide discount on full-price items only.",
      "SAVE20",
      "PROMO_CODE",
      "https://www.example.com/sale",
      "",
      "",
      "",
      "20",
      "",
      "2026-12-31",
      "CSV",
      "example-1001",
      "Fashion",
      "Excludes clearance.",
    ],
    [
      "Example Store",
      "Air fryer reduced to $59.99",
      "Single product price drop, no code needed.",
      "",
      "DEAL",
      "https://www.example.com/air-fryer",
      "",
      "119.99",
      "59.99",
      "",
      "",
      "",
      "CSV",
      "example-1002",
      "Home & Kitchen",
      "",
    ],
  ];

  const csv = toCsv(CSV_TEMPLATE_HEADERS, example);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dealscout-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
