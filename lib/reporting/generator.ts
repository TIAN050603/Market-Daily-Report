import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import watchlistConfig from "@/config/watchlist.json";
import { getDataProvider } from "@/lib/providers";
import { MarketNewsItem } from "@/lib/providers/types";
import { upsertReport } from "@/lib/db/reports";
import { writeReportSnapshot } from "@/lib/db/file-store";
import { GeneratedReport, SectorUpdate, Source, TopSignal, WatchlistItem } from "@/lib/types";
import { getMonthlyReportPath, getTodayDate } from "./date-utils";
import { renderMarkdown } from "./markdown";

function sourceRows(items: MarketNewsItem[], reportDate: string): Source[] {
  return items.flatMap((item) =>
    item.source_urls.map((source) => ({
      title: source.title || item.title,
      url: source.url,
      publisher: new URL(source.url).hostname.replace(/^www\./, ""),
      published_at: reportDate,
      related_section: item.category
    }))
  );
}

function moduleSourceRows(
  reportDate: string,
  modules: { section: string; urls: { title?: string; url: string }[] }[]
): Source[] {
  const seen = new Set<string>();
  return modules.flatMap((module) =>
    module.urls
      .filter((source) => {
        const key = `${module.section}:${source.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((source) => ({
        title: source.title || module.section,
        url: source.url,
        publisher: new URL(source.url).hostname.replace(/^www\./, ""),
        published_at: reportDate,
        related_section: module.section
      }))
  );
}

const sources = {
  nyseHoliday: { title: "NYSE holiday calendar", url: "https://www.nyse.com/markets/hours-calendars?os=roku___" },
  beaSchedule: { title: "BEA release schedule", url: "https://www.bea.gov/news/schedule" },
  fedCalendar: { title: "Federal Reserve calendar", url: "https://www.federalreserve.gov/newsevents/calendar.htm" },
  nvidia: { title: "Axios Nvidia earnings", url: "https://www.axios.com/2026/05/20/nvidia-earnings-shows-ai-demand-is-still-roaring" },
  marvell: { title: "Marvell IR calendar", url: "https://investor.marvell.com/news-events/ir-calendar" },
  synopsys: { title: "Synopsys investor events", url: "https://investor.synopsys.com/events-and-presentations/default.aspx" },
  earnings: { title: "Kiplinger earnings calendar", url: "https://www.kiplinger.com/investing/stocks/17494/next-week-earnings-calendar-stocks" },
  cpo: {
    title: "GlobalFoundries CPO announcement",
    url: "https://www.marketscreener.com/news/globalfoundries-accelerates-adoption-of-co-packaged-optics-for-advanced-ai-data-centers-with-scale-o-ce7f58ded188ff22"
  },
  power: { title: "Axios power deal", url: "https://www.axios.com/2026/05/19/nextera-dominion-deal-power-elecricity-scale" },
  intuit: {
    title: "Intuit 8-K",
    url: "https://investors.intuit.com/sec-filings/all-sec-filings/content/0000896878-26-000024/intu-20260520.htm"
  },
  takeTwo: {
    title: "Take-Two earnings release",
    url: "https://ir.take2games.com/static-files/de7eeb58-9a3d-44c4-8407-9b0453cae8a4"
  },
  microchip: {
    title: "Microchip 10-K",
    url: "https://ir.microchip.com/sec-filings/all-sec-filings/content/0000827054-26-000016/0000827054-26-000016.pdf"
  }
};

function signalDirection(item: MarketNewsItem): TopSignal["direction"] {
  if (item.category === "energy" || item.category === "macro") return "uncertain";
  if (["ai", "semiconductor", "optical_communication"].includes(item.category)) return "bullish";
  return "uncertain";
}

function sectorSentiment(name: string): SectorUpdate["sentiment"] {
  if (["AI Infrastructure", "Semiconductors", "Optical Communication / Networking", "Data Center Power / Energy"].includes(name)) {
    return "bullish";
  }
  if (name === "Cloud / Software") return "mixed";
  return "uncertain";
}

function matchingNews(items: MarketNewsItem[], sectorName: string, categories: MarketNewsItem["category"][]) {
  const normalizedSector = sectorName.toLowerCase();
  return items
    .filter(
      (item) =>
        categories.includes(item.category) ||
        item.affected_sectors.some((sector) => normalizedSector.includes(sector.toLowerCase()) || sector.toLowerCase().includes(normalizedSector))
    )
    .slice(0, 3);
}

function dynamicCatalysts(matches: MarketNewsItem[], fallback: string[]) {
  if (!matches.length) return fallback;
  return matches.map((item) => `${item.title}：${item.summary}`);
}

function dynamicSources(matches: MarketNewsItem[], fallback: { title: string; url: string }[]) {
  const urls = matches.flatMap((item) => item.source_urls);
  return urls.length ? urls : fallback;
}

function buildSectorUpdates(newsItems: MarketNewsItem[] = []): SectorUpdate[] {
  const sectors = [
    {
      sector_name: "AI Infrastructure",
      categories: ["ai", "data_center"] as MarketNewsItem["category"][],
      latest_catalysts: ["Nvidia 财报继续支撑 AI 数据中心需求", "Dell/服务器链本周验证 backlog 和利润率"],
      beneficiary_tickers: ["NVDA", "DELL", "SMCI", "VRT", "ANET"],
      pressured_tickers: ["估值高但订单验证不足的 AI 概念股"],
      watch_signals: ["AI server backlog", "GPU supply", "推理需求", "云厂商 capex"],
      source_urls: [sources.nvidia, sources.earnings]
    },
    {
      sector_name: "Semiconductors",
      categories: ["semiconductor", "ai"] as MarketNewsItem["category"][],
      latest_catalysts: ["Marvell 与 Synopsys 财报将验证 AI ASIC 和 EDA 活跃度"],
      beneficiary_tickers: ["MRVL", "AVGO", "SNPS", "CDNS", "TSM", "ASML"],
      pressured_tickers: ["MCHP", "传统 MCU/汽车工业链复苏较慢标的"],
      watch_signals: ["数据中心收入", "先进制程需求", "毛利率", "客户集中度"],
      source_urls: [sources.marvell, sources.synopsys, sources.microchip]
    },
    {
      sector_name: "Optical Communication / Networking",
      categories: ["optical_communication", "data_center"] as MarketNewsItem["category"][],
      latest_catalysts: ["CPO、硅光、1.6T 光模块成为 AI 集群扩容瓶颈"],
      beneficiary_tickers: ["COHR", "LITE", "CIEN", "AAOI", "MRVL", "AVGO", "GLW"],
      pressured_tickers: ["订单兑现慢或价格竞争加剧的高波动光模块股"],
      watch_signals: ["1.6T 订单", "CPO 量产", "DSP 供应", "交换芯片路线图"],
      source_urls: [sources.cpo, sources.marvell]
    },
    {
      sector_name: "Cloud / Software",
      categories: ["cloud", "software", "ai"] as MarketNewsItem["category"][],
      latest_catalysts: ["Salesforce、Snowflake 财报检验企业 AI 软件变现"],
      beneficiary_tickers: ["CRM", "SNOW", "MSFT", "ORCL", "DDOG"],
      pressured_tickers: ["INTU", "AI 替代风险较高的软件股"],
      watch_signals: ["RPO", "净留存率", "AI 产品 ARPU", "云消费增长"],
      source_urls: [sources.earnings, sources.intuit]
    },
    {
      sector_name: "Data Center Power / Energy",
      categories: ["energy", "data_center"] as MarketNewsItem["category"][],
      latest_catalysts: ["AI 用电需求推动公用事业、核能、电网设备重估"],
      beneficiary_tickers: ["NEE", "D", "CEG", "VST", "ETN", "PWR", "VRT"],
      pressured_tickers: ["电力接入慢且融资成本高的数据中心项目"],
      watch_signals: ["PPA 价格", "监管审批", "核能项目", "电网接入"],
      source_urls: [sources.power]
    },
    {
      sector_name: "Robotics / Automation",
      categories: ["ai", "other"] as MarketNewsItem["category"][],
      latest_catalysts: ["AI 从云端模型向实体自动化扩散仍是中期主题"],
      beneficiary_tickers: ["TSLA", "ISRG", "ROK", "TER"],
      pressured_tickers: ["订单不清晰的纯概念机器人股"],
      watch_signals: ["量产节奏", "单位经济性", "企业自动化 capex"],
      source_urls: [sources.earnings]
    },
    {
      sector_name: "Space / Defense Tech",
      categories: ["defense", "geopolitical"] as MarketNewsItem["category"][],
      latest_catalysts: ["太空商业化和国防科技仍受预算、发射合同与地缘政治驱动"],
      beneficiary_tickers: ["RKLB", "ASTS", "LMT", "NOC", "PLTR"],
      pressured_tickers: ["现金流弱、依赖融资的早期太空股"],
      watch_signals: ["发射频率", "政府合同", "预算案", "订单积压"],
      source_urls: [sources.earnings]
    },
    {
      sector_name: "Crypto-related Tech",
      categories: ["crypto"] as MarketNewsItem["category"][],
      latest_catalysts: ["加密风险偏好和矿企 AI 数据中心转型继续影响股价"],
      beneficiary_tickers: ["COIN", "MSTR", "RIOT", "MARA", "IREN", "CRCL"],
      pressured_tickers: ["高杠杆矿企", "电力成本上行的挖矿股"],
      watch_signals: ["BTC/ETH 价格", "稳定币监管", "AI hosting 合同质量"],
      source_urls: [sources.earnings]
    },
    {
      sector_name: "Other Tech-linked Themes",
      categories: ["macro", "regulation", "geopolitical", "other"] as MarketNewsItem["category"][],
      latest_catalysts: ["宏观利率、关税、出口管制和地缘政治仍会穿透影响科技估值"],
      beneficiary_tickers: ["AAPL", "GOOGL", "META", "AMZN"],
      pressured_tickers: ["供应链或监管暴露较高的科技股"],
      watch_signals: ["美元", "关税", "出口管制", "反垄断监管"],
      source_urls: [sources.beaSchedule, sources.fedCalendar]
    }
  ];

  return sectors.map((sector) => {
    const matches = matchingNews(newsItems, sector.sector_name, sector.categories);
    const { categories, ...sectorWithoutCategories } = sector;
    void categories;
    return {
      ...sectorWithoutCategories,
      latest_catalysts: dynamicCatalysts(matches, sector.latest_catalysts),
      source_urls: dynamicSources(matches, sector.source_urls),
      sentiment: sectorSentiment(sector.sector_name)
    };
  });
}

function buildWatchlist(reportDate: string): WatchlistItem[] {
  return [
    {
      symbol_or_sector: "MRVL",
      reason_to_watch: "AI ASIC、光互连和数据中心网络的本周核心验证点。",
      key_trigger: `${reportDate} 所在周财报和电话会`,
      risk_points: "预期过高、毛利率、客户集中度。",
      priority: "high",
      source_urls: [sources.marvell]
    },
    {
      symbol_or_sector: "PCE / 美债收益率",
      reason_to_watch: "直接决定高估值成长股的估值折现率。",
      key_trigger: "BEA PCE 发布",
      risk_points: "通胀偏热导致收益率上行。",
      priority: "high",
      source_urls: [sources.beaSchedule]
    },
    {
      symbol_or_sector: "DELL / AI Server Chain",
      reason_to_watch: "检验 AI 服务器需求是否能转化为高质量利润。",
      key_trigger: "Dell 财报中的 AI backlog 和 server margin",
      risk_points: "低毛利订单、供应链成本。",
      priority: "high",
      source_urls: [sources.earnings]
    },
    {
      symbol_or_sector: "Optical Communication",
      reason_to_watch: "网络和光互连可能是 AI 集群扩容的新瓶颈。",
      key_trigger: "1.6T 光模块订单、CPO 路线图、MRVL/AVGO commentary",
      risk_points: "高波动、订单兑现慢。",
      priority: "medium",
      source_urls: [sources.cpo, sources.marvell]
    }
  ];
}

function reportThemeForDate(date: string, rankedNews: MarketNewsItem[]) {
  if (date === "2026-05-25") {
    return {
      market_session: "non-trading-day" as const,
      main_theme: "Memorial Day 休市，等待 2026-05-26 重新定价 AI 财报与宏观风险",
      market_summary:
        "2026-05-25 美股因 Memorial Day 休市，这份报告更像盘前准备清单：重点不是盘中走势，而是整理 2026-05-26 开盘后可能被重新定价的 AI 基础设施财报、PCE/GDP 数据、利率变化和半导体产业链信号。"
    };
  }

  const top = rankedNews[0];
  const second = rankedNews[1];
  if (top) {
    return {
      market_session: "premarket" as const,
      main_theme: `${date} 盘前主线：${top.title}`,
      market_summary:
        `${date} 的报告由当日公开新闻源重新抓取生成。最高权重信号是“${top.title}”，涉及 ${top.affected_sectors.join("、")}；` +
        (second ? `第二层信号是“${second.title}”。` : "") +
        " 这些信息仍需结合盘前价格、成交量、公司公告和宏观数据发布后的市场反应确认。"
    };
  }

  return {
    market_session: "premarket" as const,
    main_theme: `${date} 盘前主线：AI 基础设施业绩验证遇上 PCE/利率再定价`,
    market_summary:
      `${date} 主页面应显示这份盘前报告：市场从 Memorial Day 休市后重新开盘，资金会同时评估 AI 基础设施财报兑现、半导体/光通信外溢机会，以及 PCE、GDP、美债收益率对高估值科技股的压力。科技股更可能分化，而不是单边上涨或下跌。`
  };
}

export async function generateMarketReport(date = getTodayDate()) {
  const provider = getDataProvider();
  const [marketNews, sectorNews, upcomingEvents, decliners] = await Promise.all([
    provider.fetchMarketNews(date),
    provider.fetchSectorNews(date),
    provider.fetchUpcomingEvents(date, 7),
    provider.fetchBigDecliners(date)
  ]);

  const rankedNews = [...marketNews, ...sectorNews].sort((a, b) => b.importance_score - a.importance_score);
  const sectors = buildSectorUpdates(rankedNews);
  const watchlist = buildWatchlist(date);
  const topSignals: TopSignal[] = rankedNews.slice(0, 5).map((item) => ({
    title: item.title,
    summary: `${item.summary} 信息性质：${item.fact_status === "fact" ? "已经发生的事实" : item.fact_status === "expectation" ? "市场预期" : item.fact_status === "inference" ? "合理推测" : "不确定信息"}。`,
    why_it_matters: "该信号可能影响资金对指数、AI 科技链和长久期成长股的风险定价。",
    direction: signalDirection(item),
    affected_sectors: item.affected_sectors,
    affected_tickers: item.affected_tickers,
    impact_horizon: item.importance_score >= 88 ? "this_week" : "medium_term",
    importance_score: item.importance_score,
    source_urls: item.source_urls
  }));
  const theme = reportThemeForDate(date, rankedNews);

  const generated: GeneratedReport = {
    report: {
      report_date: date,
      generated_at: new Date().toISOString(),
      market_session: theme.market_session,
      market_summary: theme.market_summary,
      overall_sentiment: "mixed",
      main_theme: theme.main_theme,
      markdown_summary: ""
    },
    topSignals,
    events: upcomingEvents,
    sectors,
    macro: {
      treasury_yields: "重点观察 10Y/2Y 美债在 PCE 前后的变化；收益率上行会压制成长股估值。",
      dollar_index: "美元方向取决于 PCE、GDP 和 Fed 预期，偏强美元通常压制跨国科技公司估值。",
      crude_oil: "油价若因地缘政治重新上冲，会通过通胀预期影响利率和风险偏好。",
      gold: "黄金作为风险和实际利率敏感资产，若与美元同涨通常代表避险需求升温。",
      vix: "指数强势但个股分化，VIX 低位不代表单股风险低。",
      macro_data: "本周关键数据为 PCE、Q1 GDP 二次估算、耐用品订单、消费者信心。",
      growth_tech_smallcap_impact: "通胀降温利好成长股和小盘；通胀偏热或油价上冲会优先压制高估值 AI/软件。",
      source_urls: [sources.beaSchedule, sources.fedCalendar]
    },
    decliners,
    watchlist,
    sources: [
      ...sourceRows(rankedNews, date),
      ...moduleSourceRows(date, [
        ...upcomingEvents.map((event) => ({ section: `event:${event.event_name}`, urls: event.source_urls })),
        ...sectors.map((sector) => ({ section: `sector:${sector.sector_name}`, urls: sector.source_urls })),
        ...decliners.map((decliner) => ({ section: `decliner:${decliner.ticker}`, urls: decliner.source_urls })),
        ...watchlist.map((item) => ({ section: `watchlist:${item.symbol_or_sector}`, urls: item.source_urls })),
        { section: "macro", urls: [sources.beaSchedule, sources.fedCalendar] }
      ])
    ]
  };

  generated.report.markdown_summary = renderMarkdown(generated);
  const saved = upsertReport(generated);
  writeMonthlyMarkdown(saved);
  writeReportSnapshot(saved);
  return saved;
}

export function writeMonthlyMarkdown(report: ReturnType<typeof upsertReport>) {
  const monthly = getMonthlyReportPath(report.report.report_date);
  const dir = path.join(/* turbopackIgnore: true */ process.cwd(), monthly.dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(/* turbopackIgnore: true */ dir, monthly.file), report.report.markdown_summary, "utf8");
}

export const configuredWatchlist = watchlistConfig;
