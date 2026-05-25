import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "market-daily-report",
    checked_at: new Date().toISOString()
  });
}
