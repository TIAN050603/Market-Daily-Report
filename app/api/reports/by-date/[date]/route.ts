import { NextResponse } from "next/server";
import { getReportByDate } from "@/lib/db/reports";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const report = getReportByDate(date);
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json(report);
}
