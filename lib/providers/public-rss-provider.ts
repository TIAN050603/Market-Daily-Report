import watchlistConfig from "@/config/watchlist.json";
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

function toNewsItem(query: RssQuery, item: RssItem, index: number): MarketNewsItem {
  const affectedTickers = inferTickers(item.title, query.tickers ?? []);
  const publisher = item.source ? ` - ${item.source}` : "";
  return {
    title: item.title,
    summary:
      `公开新闻源${publisher}在该主题下出现该信号。系统将其归入 ${query.sectors.join(", ")}，需要结合盘前价格、成交量和后续正式公告确认影响强度。`,
    category: query.category,
    fact_status: inferDirection(item),
    affected_tickers: affectedTickers,
    affected_sectors: query.sectors,
    importance_score: Math.max(55, query.score - index * 3),
    source_urls: source(item.source || "Google News RSS", item.link)
  };
}

export class PublicRssMarketDataProvider implements DataProvider {
  private fallback = new MockMarketDataProvider();

  private async fetchQuery(query: RssQuery): Promise<MarketNewsItem[]> {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query.query)}&hl=en-US&gl=US&ceid=US:en`;
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

  private async fetchNewsFor(queries: RssQuery[], fallback: () => Promise<MarketNewsItem[]>) {
    try {
      const settled = await Promise.allSettled(queries.map((query) => this.fetchQuery(query)));
      const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      const unique = uniqueByUrl(items).sort((a, b) => b.importance_score - a.importance_score);
      if (unique.length >= 3) return unique;
      return fallback();
    } catch {
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
    return this.fetchNewsFor(rssQueries.slice(0, 3), () => this.fallback.fetchMarketNews(date));
  }

  async fetchSectorNews(date: string): Promise<MarketNewsItem[]> {
    return this.fetchNewsFor(rssQueries.slice(3, 8), () => this.fallback.fetchSectorNews(date));
  }

  async fetchBigDecliners(date: string): Promise<BigDecliner[]> {
    return this.fallback.fetchBigDecliners(date);
  }

  async fetchTickerNews(ticker: string, date: string): Promise<MarketNewsItem[]> {
    const query: RssQuery = {
      query: `${ticker} stock shares earnings analyst downgrade market news`,
      category: "other",
      sectors: ["Single Stock"],
      tickers: [ticker],
      score: 82
    };
    return this.fetchNewsFor([query], () => this.fallback.fetchTickerNews(ticker, date));
  }

  async fetchEconomicCalendar(date: string): Promise<EventCalendarItem[]> {
    return this.fetchMacroEvents(date);
  }

  async fetchUpcomingEvents(date: string, days = 7): Promise<EventCalendarItem[]> {
    return this.fallback.fetchUpcomingEvents(date, days);
  }
}
