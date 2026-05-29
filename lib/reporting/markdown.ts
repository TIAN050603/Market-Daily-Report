import { FullReport, GeneratedReport } from "@/lib/types";
import { getCoverageRange } from "./date-utils";

type RenderableReport = FullReport | GeneratedReport;

function links(urls: { title?: string; url: string }[]) {
  return urls.map((item) => `[${item.title || item.url}](${item.url})`).join(", ");
}

export function renderMarkdown(full: RenderableReport) {
  const { report, topSignals, events, sectors, macro, decliners, watchlist, narratives } = full;
  const coverage = getCoverageRange(report.report_date);
  const summary = report.market_summary
    .replaceAll("今天", report.report_date)
    .replaceAll("今日", report.report_date);
  return `# Daily US Market Intelligence Report
日期：${report.report_date}
覆盖范围：${coverage.start} 至 ${coverage.end}
美股状态：${report.market_session}

## 1. ${report.report_date} 最重要的 3-5 个市场信号
${topSignals
  .map(
    (item, index) => `### ${index + 1}. ${item.title}
- 事件 / 信号是什么：${item.summary}
- 为什么重要：${item.why_it_matters}
- 可能影响的方向：${item.direction}
- 可能影响的板块或股票：${[...item.affected_sectors, ...item.affected_tickers].join(", ")}
- 影响时间：${item.impact_horizon}
- 信息来源链接：${links(item.source_urls)}`
  )
  .join("\n\n")}

## 2. ${coverage.start} 至 ${coverage.end} 关键事件日历
| 日期 | 事件 | 重要性 | 可能影响的资产或板块 | 需要关注的关键点 | 来源 |
|---|---|---|---|---|---|
${events
  .map(
    (item) =>
      `| ${item.event_date} | ${item.event_name} | ${item.importance} | ${item.affected_assets.join(", ")} | ${item.watch_points} | ${links(item.source_urls)} |`
  )
  .join("\n")}

## 3. 最近几天值得期待的财报 / 叙事
${narratives
  .map(
    (item) => `### ${item.title}
- 日期：${item.event_date}
- 类型：${item.narrative_type}
- 我看好的原因：${item.why_i_like_it}
- 核心逻辑：${item.thesis}
- 受益股票 / 板块：${item.beneficiary_tickers.join(", ")}
- 需要盯的验证点：${item.what_to_watch}
- 风险点：${item.risk_points}
- 信心等级：${item.conviction}
- 来源：${links(item.source_urls)}`
  )
  .join("\n\n")}

## 4. AI / 科技 / 半导体 / 光通信重点观察
${sectors
  .map(
    (item) => `### ${item.sector_name}
- 最新催化：${item.latest_catalysts.join("；")}
- 受益股票：${item.beneficiary_tickers.join(", ") || "暂无明确"}
- 承压股票：${item.pressured_tickers.join(", ") || "暂无明确"}
- 需要继续观察的信号：${item.watch_signals.join("；")}
- 板块情绪：${item.sentiment}
- 来源：${links(item.source_urls)}`
  )
  .join("\n\n")}

## 5. 大盘与宏观环境
- 美债收益率变化：${macro?.treasury_yields ?? "待更新"}
- 美元指数：${macro?.dollar_index ?? "待更新"}
- 原油 / 黄金：${macro?.crude_oil ?? "待更新"}；${macro?.gold ?? "待更新"}
- VIX 或市场风险偏好：${macro?.vix ?? "待更新"}
- 重要宏观数据或预期：${macro?.macro_data ?? "待更新"}
- 对成长股、科技股、小盘股的影响：${macro?.growth_tech_smallcap_impact ?? "待更新"}
- 来源：${macro ? links(macro.source_urls) : "待更新"}

## 6. 前一个交易日跌幅较大的股票复盘
${decliners
  .map(
    (item) => `### ${item.ticker} - ${item.company_name}
- 前一交易日跌幅：${item.previous_day_change_percent}%
- 成交量是否异常：${item.volume_note}
- 可能下跌原因：${item.reason}
- 原因类型：${item.reason_type}
- 催化：${item.catalysts.join("；")}
- 需要继续观察的点：${item.watch_points}
- 来源：${links(item.source_urls)}`
  )
  .join("\n\n")}

## 7. ${report.report_date} 值得重点盯盘的股票 / 板块
| 股票 / 板块 | 为什么值得看 | 关键触发点 | 风险点 | 优先级 | 来源 |
|---|---|---|---|---|---|
${watchlist
  .map((item) => `| ${item.symbol_or_sector} | ${item.reason_to_watch} | ${item.key_trigger} | ${item.risk_points} | ${item.priority} | ${links(item.source_urls)} |`)
  .join("\n")}

## 8. 总结：${report.report_date} 市场的主线是什么？
${summary}

来源说明：本总结综合以上 Top Signals、事件日历、板块、宏观和个股复盘模块的公开来源，不构成买卖建议。
`;
}
