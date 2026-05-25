import { NextRequest, NextResponse } from "next/server";
import { listReports } from "@/lib/db/reports";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = listReports({
    page: Number(params.get("page") || 1),
    pageSize: Number(params.get("pageSize") || 12),
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    q: params.get("q") || undefined,
    sentiment: params.get("sentiment") || undefined,
    sector: params.get("sector") || undefined,
    importance: params.get("importance") || undefined
  });
  return NextResponse.json(result);
}
