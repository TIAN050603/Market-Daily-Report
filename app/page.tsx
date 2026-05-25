import Link from "next/link";
import {
  Decliners,
  EventCalendar,
  HistoryEntry,
  MacroSection,
  Overview,
  SectorGrid,
  TopSignals,
  Watchlist
} from "@/components/report-sections";
import { getLatestReport } from "@/lib/db/reports";
import { generateMarketReport } from "@/lib/reporting/generator";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let report = getLatestReport();
  if (!report) {
    report = await generateMarketReport("2026-05-25");
  }

  return (
    <>
      <Overview report={report} />
      <div className="side-nav">
        <a href="#signals">Top Signals</a>
        <a href="#events">Events</a>
        <a href="#sectors">Sectors</a>
        <a href="#macro">Macro</a>
        <a href="#decliners">Decliners</a>
        <a href="#watchlist">Watchlist</a>
        <Link href={`/reports/${report.report.id}`}>Full Detail</Link>
      </div>
      <TopSignals report={report} />
      <EventCalendar report={report} />
      <SectorGrid report={report} />
      <MacroSection report={report} />
      <Decliners report={report} />
      <Watchlist report={report} />
      <HistoryEntry />
    </>
  );
}
