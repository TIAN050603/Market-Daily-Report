import Link from "next/link";
import { ImportanceBadge, SentimentBadge, TagList } from "@/components/badges";
import { listReports } from "@/lib/db/reports";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const result = listReports({
    page: Number(params.page || 1),
    q: params.q,
    from: params.from,
    to: params.to,
    sentiment: params.sentiment,
    sector: params.sector,
    importance: params.importance
  });

  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head">
          <h1>历史报告查询</h1>
          <Link className="button ghost" href="/">Back to Dashboard</Link>
        </div>
        <form className="toolbar">
          <div className="field">
            <label>关键词</label>
            <input name="q" defaultValue={params.q || ""} placeholder="NVDA, 半导体, 光通信, PCE..." />
          </div>
          <div className="field">
            <label>开始日期</label>
            <input name="from" type="date" defaultValue={params.from || ""} />
          </div>
          <div className="field">
            <label>结束日期</label>
            <input name="to" type="date" defaultValue={params.to || ""} />
          </div>
          <div className="field">
            <label>情绪</label>
            <select name="sentiment" defaultValue={params.sentiment || ""}>
              <option value="">All</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="mixed">Mixed</option>
              <option value="uncertain">Uncertain</option>
            </select>
          </div>
          <div className="field">
            <label>重要性</label>
            <select name="importance" defaultValue={params.importance || ""}>
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="field">
            <label>板块</label>
            <input name="sector" defaultValue={params.sector || ""} placeholder="AI, Data Center..." />
          </div>
          <button className="button" type="submit">Search</button>
        </form>
      </section>

      <section className="report-list">
        {result.items.map((report) => (
          <Link className="report-row" href={`/reports/${report.id}`} key={report.id}>
            <div>
              <strong>{report.report_date}</strong>
              <p>{report.market_session}</p>
            </div>
            <div>
              <h3>{report.main_theme}</h3>
              <p>{report.market_summary}</p>
              <TagList items={report.sectors.slice(0, 6)} />
            </div>
            <div>
              <SentimentBadge value={report.overall_sentiment} />
              <div className="tags">
                <ImportanceBadge value={report.top_signal_count >= 3 ? "high" : "medium"} />
                <span className="tag">{report.event_count} events</span>
                <span className="tag">{report.decliner_count} decliners</span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
