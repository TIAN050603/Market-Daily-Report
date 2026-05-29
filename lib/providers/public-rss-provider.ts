import watchlistConfig from "@/config/watchlist.json";
import { addDays, formatDate } from "@/lib/reporting/date-utils";
import { BigDecliner, EventCalendarItem, SourceUrl } from "@/lib/types";
import { DataProvider, MarketNewsItem } from "./types";
import { MockMarketDataProvider } from "./mock-provider";

type RssQuery = {
  query: string;
  category: MarketNewsItem["category"];
  sectors: string[];
  tickers?: string[];
  score: number;
};

type RssItem = {
  title: string;
  link: string;
  publishedAt?: string;
  source?: string;
};

type LoserRow = {
  symbol: string;
  companyName: string;
  changePercent: number;
  volume: string;
};

const rssQueries: RssQuery[] = [
  {
    query: "US stock market Nasdaq S&P 500 premarket Fed inflation Treasury yields",
    category: "macro",
    sectors: ["Macro", "Rates", "Nasdaq"],
    tickers: ["QQQ", "SPY"],
    score: 94
  },
  {
    query: "AI infrastructure earnings Nvidia data center GPU server stocks",
    category: "ai",
    sectors: ["AI Infrastructure", "Data Center", "Semiconductor"],
    tickers: ["NVDA", "DELL", "SMCI", "VRT", "ANET"],
    score: 92
  },
  {
    query: "semiconductor stocks AI chip earnings Nvidia AMD Broadcom Marvell TSM ASML",
    category: "semiconductor",
    sectors: ["Semiconductor", "AI ASIC", "GPU"],
    tickers: ["NVDA", "AMD", "AVGO", "MRVL", "TSM", "ASML", "ARM"],
    score: 90
  },
  {
    query: "optical networking CPO silicon photonics data center AI stocks",
    category: "optical_communication",
    sectors: ["Optical Communication", "Networking", "Data Center"],
    tickers: ["COHR", "LITE", "CIEN", "AAOI", "MRVL", "AVGO"],
    score: 84
  },
  {
    query: "cloud software AI monetization earnings cybersecurity SaaS stocks",
    category: "software",
    sectors: ["Cloud", "Software", "Cybersecurity"],
    tickers: ["MSFT", "GOOGL", "AMZN", "CRM", "SNOW", "DDOG", "CRWD"],
    score: 82
  },
  {
    query: "data center power nuclear energy grid electricity AI demand stocks",
    category: "energy",
    sectors: ["Data Center Power", "Energy", "Grid Infrastructure"],
    tickers: ["CEG", "VST", "NEE", "ETN", "PWR", "VRT"],
    score: 82
  },
  {
    query: "space defense technology stocks rocket satellite Pentagon AI",
    category: "defense",
    sectors: ["Space Tech", "Defense Tech"],
    tickers: ["RKLB", "ASTS", "LMT", "NOC", "PLTR"],
    score: 78
  },
  {
    query: "crypto related stocks Coinbase MicroStrategy Bitcoin miners market",
    category: "crypto",
    sectors: ["Crypto Infrastructure"],
    tickers: ["COIN", "MSTR", "MARA", "RIOT", "IREN", "CRCL"],
    score: 76
  },
  {
    query: "US stocks biggest decliners shares fall earnings analyst downgrade",
    category: "other",
    sectors: ["Single Stocks", "Earnings", "Analyst Ratings"],
    score: 74
  }
];

const tickerUniverse = new Set<string>([
  ...watchlistConfig.tickers,
  "QQQ",
  "SPY",
  "SMH",
  "DIA",
  "IWM",
  "CRWD",
  "SNOW",
  "CRM",
  "DDOG",
  "CEG",
  "VST",
  "ETN",
  "PWR",
  "COIN",
  "MSTR",
  "MARA",
  "RIOT",
  "IREN"
]);

const source = (title: string, url: string): SourceUrl[] => [{ title, url }];

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function textBetween(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function parseGoogleNewsRss(xml: string): RssItem[] {
  const parsed: RssItem[] = [];
  for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const item = match[0];
    const title = textBetween(item, "title");
    const link = textBetween(item, "link");
    if (!title || !link) continue;
    parsed.push({
      title,
      link,
      publishedAt: textBetween(item, "pubDate"),
      source: textBetween(item, "source")
    });
  }
  return parsed;
}

function uniqueByUrl(items: MarketNewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const url = item.source_urls[0]?.url || item.title;
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function inferTickers(text: string, fallback: string[] = []) {
  const normalized = text.toUpperCase();
  const found = [...tickerUniverse].filter((ticker) => {
    const escaped = ticker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^A-Z])${escaped}([^A-Z]|$)`).test(normalized);
  });
  return [...new Set([...found, ...fallback])].slice(0, 8);
}

function inferDirection(item: RssItem): MarketNewsItem["fact_status"] {
  const title = item.title.toLowerCase();
  if (/(may|could|expected|forecast|preview|watch|set to)/.test(title)) return "expectation";
  if (/(report|says|announces|files|beats|misses|falls|rises)/.test(title)) return "fact";
  return "uncertain";
}

function categoryReadThrough(query: RssQuery, tickers: string[]) {
  const tickerText = tickers.length ? `直接映射到 ${tickers.slice(0, 5).join(", ")}。` : "暂未锁定单一股票，先按板块信号处理。";
  switch (query.category) {
    case "macro":
      return `这是影响指数估值倍数的宏观信号，重点看美债收益率和美元是否同步上行。若利率压力升温，Nasdaq、SMH 和高估值软件通常更容易承压；若利率回落，AI/半导体反弹弹性更大。${tickerText}`;
    case "ai":
      return `这是 AI 资本开支链条信号，核心不是“AI 热不热”，而是订单是否能从 NVDA 外溢到服务器、散热、电源、网络和数据中心运营商。${tickerText}`;
    case "semiconductor":
      return `这是半导体风格切换信号，重点区分 GPU/ASIC/先进封装受益股和传统 MCU、汽车工业链。若资金继续追逐 AI 算力，SMH 内部会继续分化。${tickerText}`;
    case "optical_communication":
      return `这是 AI 集群网络瓶颈信号，重点看 1.6T 光模块、CPO、硅光、DSP 和交换芯片是否成为下一段 capex 重点。${tickerText}`;
    case "software":
    case "cloud":
      return `这是企业 AI 变现信号，重点看 AI 功能能否变成 RPO、净留存、云消费和价格提升，而不是只停留在产品叙事。${tickerText}`;
    case "energy":
      return `这是 AI 数据中心约束信号，电力接入、PPA、核能、电网设备和散热可能成为算力扩张的真实瓶颈。${tickerText}`;
    case "defense":
      return `这是国防科技和太空商业化信号，重点看政府预算、合同节奏、发射频率和订单积压，而不是单纯概念热度。${tickerText}`;
    case "crypto":
      return `这是风险偏好信号，重点看 BTC/ETH、稳定币监管、矿企转 AI hosting 的合同质量，以及高杠杆标的是否放大波动。${tickerText}`;
    default:
      return `这是单股或行业异动信号，重点看是否来自财报、评级、监管、融资或行业轮动。${tickerText}`;
  }
}

function toNewsItem(query: RssQuery, item: RssItem, index: number): MarketNewsItem {
  const affectedTickers = inferTickers(item.title, query.tickers ?? []);
  return {
    title: item.title,
    summary: `${categoryReadThrough(query, affectedTickers)} 来源主题：${query.sectors.join(", ")}。`,
    category: query.category,
    fact_status: inferDirection(item),
    affected_tickers: affectedTickers,
    affected_sectors: query.sectors,
    importance_score: Math.max(55, query.score - index * 3),
    source_urls: source(item.source || "Google News RSS", item.link)
  };
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, "|").replace(/\|+/g, "|").replace(/^\||\|$/g, ""));
}

function parseStockAnalysisLosers(html: string): LoserRow[] {
  const tableStart = html.indexOf('<table id="main-table"');
  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableStart < 0 || tableEnd < 0) return [];
  const table = html.slice(tableStart, tableEnd);
  return (table.match(/<tr[\s\S]*?<\/tr>/g) ?? [])
    .slice(1)
    .map((row) => stripTags(row).split("|"))
    .map((cells) => ({
      symbol: cells[1],
      companyName: cells[2],
      changePercent: Number((cells[3] ?? "").replace("%", "")),
      volume: cells[5] ?? "N/A"
    }))
    .filter((row) => row.symbol && row.companyName && Number.isFinite(row.changePercent));
}

function isRelevantDecliner(row: LoserRow) {
  const text = `${row.symbol} ${row.companyName}`.toUpperCase();
  const isWatched = tickerUniverse.has(row.symbol.toUpperCase());
  const techWords = /(AI|SEMICONDUCTOR|TECH|CLOUD|DATA|ENERGY|ELECTRIC|AEROSPACE|ROCKET|SPACE|CRYPTO|SOFTWARE|OPTICAL|POWER)/.test(text);
  return isWatched || techWords || row.changePercent <= -8;
}

export class PublicRssMarketDataProvider implements DataProvider {
  private fallback = new MockMarketDataProvider();
  private allowMockFallback = process.env.ALLOW_MOCK_FALLBACK === "1" || process.env.DATA_PROVIDER !== "public_rss";

  private dateScopedQuery(query: string, date?: string) {
    if (!date) return query;
    const after = formatDate(addDays(date, -1));
    const before = formatDate(addDays(date, 1));
    return `${query} after:${after} before:${before}`;
  }

  private async fetchQuery(query: RssQuery, date?: string): Promise<MarketNewsItem[]> {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(this.dateScopedQuery(query.query, date))}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Market-Daily-Report/1.0"
      }
    });
    if (!response.ok) {
      throw new Error(`RSS request failed: ${response.status} ${response.statusText}`);
    }
    const xml = await response.text();
    return parseGoogleNewsRss(xml)
      .slice(0, 4)
      .map((item, index) => toNewsItem(query, item, index));
  }

  private async fetchNewsFor(queries: RssQuery[], fallback: () => Promise<MarketNewsItem[]>, minItems = 3, date?: string) {
    try {
      const settled = await Promise.allSettled(queries.map((query) => this.fetchQuery(query, date)));
      const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      const unique = uniqueByUrl(items).sort((a, b) => b.importance_score - a.importance_score);
      if (unique.length >= minItems) return unique;
      if (!this.allowMockFallback) {
        throw new Error(`Live RSS returned only ${unique.length} usable items`);
      }
      return fallback();
    } catch (error) {
      if (!this.allowMockFallback) throw error;
      return fallback();
    }
  }

  async fetchMacroEvents(date: string): Promise<EventCalendarItem[]> {
    return this.fallback.fetchMacroEvents(date);
  }

  async fetchFedEvents(date: string): Promise<EventCalendarItem[]> {
    return this.fallback.fetchFedEvents(date);
  }

  async fetchEarningsEvents(date: string): Promise<EventCalendarItem[]> {
    return this.fallback.fetchEarningsEvents(date);
  }

  async fetchMarketNews(date: string): Promise<MarketNewsItem[]> {
    return this.fetchNewsFor(rssQueries.slice(0, 3), () => this.fallback.fetchMarketNews(date), 3, date);
  }

  async fetchSectorNews(date: string): Promise<MarketNewsItem[]> {
    return this.fetchNewsFor(rssQueries.slice(3, 8), () => this.fallback.fetchSectorNews(date), 3, date);
  }

  async fetchBigDecliners(date: string): Promise<BigDecliner[]> {
    try {
      const response = await fetch("https://stockanalysis.com/markets/losers/", {
        headers: { "User-Agent": "Mozilla/5.0 Market-Daily-Report/1.0" }
      });
      if (!response.ok) throw new Error(`StockAnalysis losers request failed: ${response.status}`);
      const selected = parseStockAnalysisLosers(await response.text())
        .filter(isRelevantDecliner)
        .slice(0, 8);
      if (!selected.length) {
        if (!this.allowMockFallback) throw new Error("StockAnalysis returned no usable loser rows");
        return this.fallback.fetchBigDecliners(date);
      }

      const withNews = await Promise.all(
        selected.map(async (row) => {
          const symbol = row.symbol;
          const news = await this.fetchNewsFor(
            [
              {
                query: `${symbol} stock shares earnings analyst downgrade market news`,
                category: "other",
                sectors: ["Single Stock"],
                tickers: [symbol],
                score: 82
              }
            ],
            async () => [],
            0,
            date
          );
          const leadNews = news[0];
          return {
            ticker: symbol,
            company_name: row.companyName,
            previous_day_change_percent: row.changePercent,
            volume_note: `StockAnalysis 显示成交量为 ${row.volume}。若该股成交额较小，单日跌幅更容易被流动性放大；若成交额较大，则更值得看作真实资金撤退。`,
            reason: leadNews
              ? `该股进入跌幅榜，同时相关公开新闻指向：“${leadNews.title}”。优先判断为单股催化或主题退潮引发的风险重定价，重点看跌幅是否扩散到同板块。`
              : "该股进入跌幅榜但未抓到明确单一新闻催化，优先按价格异动处理：若同板块多股同步下跌，更可能是行业或风险偏好问题；若孤立下跌，更可能是公司自身催化。",
            reason_type: leadNews ? ("company_specific" as const) : ("unknown" as const),
            catalysts: leadNews ? [leadNews.category, leadNews.fact_status] : ["price_action", "needs_news_confirmation"],
            watch_points: "盘前重点看是否反弹失败、同板块是否跟跌、是否出现评级/融资/监管/财报补充消息。",
            source_urls: leadNews?.source_urls?.length
              ? leadNews.source_urls
              : source("StockAnalysis top losers", "https://stockanalysis.com/markets/losers/")
          };
        })
      );

      return withNews;
    } catch (error) {
      if (!this.allowMockFallback) throw error;
      return this.fallback.fetchBigDecliners(date);
    }
  }

  async fetchTickerNews(ticker: string, date: string): Promise<MarketNewsItem[]> {
    const query: RssQuery = {
      query: `${ticker} stock shares earnings analyst downgrade market news`,
      category: "other",
      sectors: ["Single Stock"],
      tickers: [ticker],
      score: 82
    };
    return this.fetchNewsFor([query], () => this.fallback.fetchTickerNews(ticker, date), 3, date);
  }

  async fetchEconomicCalendar(date: string): Promise<EventCalendarItem[]> {
    return this.fetchMacroEvents(date);
  }

  async fetchUpcomingEvents(date: string, days = 7): Promise<EventCalendarItem[]> {
    return this.fallback.fetchUpcomingEvents(date, days);
  }
}
