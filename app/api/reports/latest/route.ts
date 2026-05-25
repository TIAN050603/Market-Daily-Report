import { NextResponse } from "next/server";
import { getLatestReport } from "@/lib/db/reports";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = getLatestReport();
  if (!report) return NextResponse.json({ error: "No reports found" }, { status: 404 });
  return NextResponse.json(report);
}
