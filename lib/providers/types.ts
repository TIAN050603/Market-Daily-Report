import { BigDecliner, EventCalendarItem, SourceUrl } from "@/lib/types";

export type MarketNewsItem = {
  title: string;
  summary: string;
  category:
    | "macro"
    | "fed"
    | "earnings"
    | "ai"
    | "semiconductor"
    | "optical_communication"
    | "cloud"
    | "software"
    | "data_center"
    | "energy"
    | "defense"
    | "crypto"
    | "biotech"
    | "consumer"
    | "regulation"
    | "geopolitical"
    | "other";
  fact_status: "fact" | "expectation" | "inference" | "uncertain";
  affected_tickers: string[];
  affected_sectors: string[];
  importance_score: number;
  source_urls: SourceUrl[];
};

export type ProviderBundle = {
  macroEvents: EventCalendarItem[];
  fedEvents: EventCalendarItem[];
  earningsEvents: EventCalendarItem[];
  marketNews: MarketNewsItem[];
  sectorNews: MarketNewsItem[];
  bigDecliners: BigDecliner[];
  upcomingEvents: EventCalendarItem[];
};

export interface DataProvider {
  fetchMacroEvents(date: string): Promise<EventCalendarItem[]>;
  fetchFedEvents(date: string): Promise<EventCalendarItem[]>;
  fetchEarningsEvents(date: string): Promise<EventCalendarItem[]>;
  fetchMarketNews(date: string): Promise<MarketNewsItem[]>;
  fetchSectorNews(date: string): Promise<MarketNewsItem[]>;
  fetchBigDecliners(date: string): Promise<BigDecliner[]>;
  fetchTickerNews(ticker: string, date: string): Promise<MarketNewsItem[]>;
  fetchEconomicCalendar(date: string): Promise<EventCalendarItem[]>;
  fetchUpcomingEvents(date: string, days?: number): Promise<EventCalendarItem[]>;
}
