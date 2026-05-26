import Link from "next/link";
import { ImportanceBadge, SentimentBadge, TagList } from "@/components/badges";
import { FullReport } from "@/lib/types";

function sourceLinks(urls: { title?: string; url: string }[]) {
  if (!urls.length) return <span className="tag">Source pending</span>;
  return urls.map((source) => (
    <a className="source-link" href={source.url} key={source.url} target="_blank" rel="noreferrer">
      {source.title || "Source"}
    </a>
  ));
}

export function Overview({ report }: { report: FullReport }) {
  const sectors = report.sectors.slice(0, 5).map((item) => item.sector_name);
  const overviewSources = [
    ...report.topSignals.flatMap((signal) => signal.source_urls),
    ...(report.macro?.source_urls ?? [])
  ].slice(0, 4);
  return (
    <section className="overview">
      <div>
        <h1>{report.report.main_theme}</h1>
        <p>{report.report.market_summary}</p>
        <TagList items={sectors} />
        <div className="tags">{sourceLinks(overviewSources)}</div>
      </div>
      <div className="meta-grid">
        <div className="meta-box">
          <span>Report date</span>
          <strong>{report.report.report_date}</strong>
        </div>
        <div className="meta-box">
          <span>Generated</span>
          <strong>{new Date(report.report.generated_at).toLocaleString("zh-CN")}</strong>
        </div>
        <div className="meta-box">
          <span>Market status</span>
          <strong>{report.report.market_session}</strong>
        </div>
        <div className="meta-box">
          <span>Sentiment</span>
          <SentimentBadge value={report.report.overall_sentiment} />
        </div>
      </div>
    </section>
  );
}

export function TopSignals({ report }: { report: FullReport }) {
  return (
    <section className="section" id="signals">
      <div className="section-head">
        <h2>今日最重要市场信号</h2>
      </div>
      <div className="grid three">
        {report.topSignals.map((signal) => (
          <article className="card" key={signal.title}>
            <div className="section-head">
              <ImportanceBadge value={signal.importance_score >= 85 ? "high" : signal.importance_score >= 65 ? "medium" : "low"} />
              <SentimentBadge value={signal.direction} />
            </div>
            <h3>{signal.title}</h3>
            <p>{signal.summary}</p>
            <p>
              <strong>Why it matters: </strong>
              {signal.why_it_matters}
            </p>
            <TagList items={[...signal.affected_sectors, ...signal.affected_tickers]} />
            <div className="tags">{sourceLinks(signal.source_urls)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EventCalendar({ report }: { report: FullReport }) {
  return (
    <section className="section" id="events">
      <div className="section-head">
        <h2>未来 7 天关键事件</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>事件</th>
              <th>类型</th>
              <th>重要性</th>
              <th>影响资产 / 板块</th>
              <th>关注点</th>
              <th>来源</th>
            </tr>
          </thead>
          <tbody>
            {report.events.map((event) => (
              <tr key={`${event.event_date}-${event.event_name}`}>
                <td>{event.event_date}</td>
                <td>{event.event_name}</td>
                <td>{event.event_type}</td>
                <td>
                  <ImportanceBadge value={event.importance} />
                </td>
                <td>{event.affected_assets.join(", ")}</td>
                <td>{event.watch_points}</td>
                <td>
                  <div className="tags">{sourceLinks(event.source_urls)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SectorGrid({ report, collapsible = false }: { report: FullReport; collapsible?: boolean }) {
  const renderSector = (sector: FullReport["sectors"][number]) => (
    <article className="card" key={sector.sector_name}>
      <div className="section-head">
        <h3>{sector.sector_name}</h3>
        <SentimentBadge value={sector.sentiment} />
      </div>
      <p>
        <strong>最新催化：</strong>
        {sector.latest_catalysts.join("；")}
      </p>
      <p>
        <strong>观察信号：</strong>
        {sector.watch_signals.join("；")}
      </p>
      <TagList items={[...sector.beneficiary_tickers.map((ticker) => `+ ${ticker}`), ...sector.pressured_tickers.map((ticker) => `- ${ticker}`)]} />
      <div className="tags">{sourceLinks(sector.source_urls)}</div>
    </article>
  );

  return (
    <section className="section" id="sectors">
      <div className="section-head">
        <h2>AI / 科技重点板块</h2>
      </div>
      {collapsible ? (
        <div className="grid two">
          {report.sectors.map((sector, index) => (
            <details className="disclosure" open={index < 3} key={sector.sector_name}>
              <summary>{sector.sector_name}</summary>
              <div className="section-head" style={{ marginTop: 12 }}>
                <SentimentBadge value={sector.sentiment} />
              </div>
              <p>
                <strong>最新催化：</strong>
                {sector.latest_catalysts.join("；")}
              </p>
              <p>
                <strong>观察信号：</strong>
                {sector.watch_signals.join("；")}
              </p>
              <TagList items={[...sector.beneficiary_tickers.map((ticker) => `+ ${ticker}`), ...sector.pressured_tickers.map((ticker) => `- ${ticker}`)]} />
              <div className="tags">{sourceLinks(sector.source_urls)}</div>
            </details>
          ))}
        </div>
      ) : (
        <div className="grid three">{report.sectors.map(renderSector)}</div>
      )}
    </section>
  );
}

export function MacroSection({ report }: { report: FullReport }) {
  const macro = report.macro;
  if (!macro) return null;
  return (
    <section className="section" id="macro">
      <div className="section-head">
        <h2>大盘与宏观环境</h2>
      </div>
      <div className="grid two">
        {[
          ["美债收益率", macro.treasury_yields],
          ["美元指数", macro.dollar_index],
          ["原油", macro.crude_oil],
          ["黄金", macro.gold],
          ["VIX / 风险偏好", macro.vix],
          ["对成长股影响", macro.growth_tech_smallcap_impact]
        ].map(([title, value]) => (
          <div className="card" key={title}>
            <h3>{title}</h3>
            <p>{value}</p>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <h3>宏观来源</h3>
        <div className="tags">{sourceLinks(macro.source_urls)}</div>
      </div>
    </section>
  );
}

export function Decliners({ report }: { report: FullReport }) {
  return (
    <section className="section" id="decliners">
      <div className="section-head">
        <h2>前一交易日大跌股票复盘</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>代码</th>
              <th>公司</th>
              <th>跌幅</th>
              <th>成交量</th>
              <th>原因</th>
              <th>类型</th>
              <th>后续观察</th>
              <th>来源</th>
            </tr>
          </thead>
          <tbody>
            {report.decliners.map((item) => (
              <tr key={item.ticker}>
                <td><strong>{item.ticker}</strong></td>
                <td>{item.company_name}</td>
                <td>{item.previous_day_change_percent}%</td>
                <td>{item.volume_note}</td>
                <td>{item.reason}</td>
                <td>{item.reason_type}</td>
                <td>{item.watch_points}</td>
                <td>
                  <div className="tags">{sourceLinks(item.source_urls)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Watchlist({ report }: { report: FullReport }) {
  return (
    <section className="section" id="watchlist">
      <div className="section-head">
        <h2>今日重点盯盘清单</h2>
      </div>
      <div className="grid two">
        {report.watchlist.map((item) => (
          <article className="card" key={item.symbol_or_sector}>
            <div className="section-head">
              <h3>{item.symbol_or_sector}</h3>
              <ImportanceBadge value={item.priority} />
            </div>
            <p>{item.reason_to_watch}</p>
            <p><strong>触发点：</strong>{item.key_trigger}</p>
            <p><strong>风险：</strong>{item.risk_points}</p>
            <div className="tags">{sourceLinks(item.source_urls)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HistoryEntry() {
  return (
    <section className="section">
      <div className="card section-head">
        <div>
          <h2>历史报告</h2>
          <p>按日期、股票代码、板块、情绪和重要性筛选历史报告。</p>
        </div>
        <Link className="button" href="/reports">
          Open History
        </Link>
      </div>
    </section>
  );
}
