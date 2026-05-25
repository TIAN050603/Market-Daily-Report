import { NextRequest, NextResponse } from "next/server";
import { logGeneration } from "@/lib/db/reports";
import { generateMarketReport } from "@/lib/reporting/generator";
import { getTodayDate } from "@/lib/reporting/date-utils";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const token = process.env.REPORT_GENERATION_TOKEN;
  if (!token) return true;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const date = body.date || getTodayDate();

  try {
    const report = await generateMarketReport(date);
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    logGeneration(date, "error", message, error instanceof Error ? error.stack : undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
