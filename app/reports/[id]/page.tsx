import Link from "next/link";
import { notFound } from "next/navigation";
import { CopySummary } from "@/components/copy-summary";
import {
  Decliners,
  EventCalendar,
  MacroSection,
  Overview,
  SectorGrid,
  TopSignals,
  Watchlist
} from "@/components/report-sections";
import { getReportById } from "@/lib/db/reports";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = getReportById(Number(id));
  if (!report) notFound();

  return (
    <>
      <Overview report={report} />
      <div className="side-nav">
        <a href="#signals">Signals</a>
        <a href="#events">Events</a>
        <a href="#sectors">Sectors</a>
        <a href="#macro">Macro</a>
        <a href="#decliners">Decliners</a>
        <a href="#watchlist">Watchlist</a>
        <Link href="/reports">History</Link>
        <CopySummary text={`${report.report.main_theme}\n\n${report.report.market_summary}`} />
      </div>
      <TopSignals report={report} />
      <EventCalendar report={report} />
      <SectorGrid report={report} collapsible />
      <MacroSection report={report} />
      <Decliners report={report} />
      <Watchlist report={report} />
      <section className="section">
        <div className="section-head">
          <h2>来源链接</h2>
        </div>
        <div className="grid two">
          {report.sources.map((source) => (
            <a className="card" href={source.url} key={`${source.related_section}-${source.url}`} target="_blank" rel="noreferrer">
              <h3>{source.title}</h3>
              <p>{source.publisher} · {source.related_section}</p>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
