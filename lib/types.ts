export type MarketSession = "premarket" | "intraday" | "afterhours" | "non-trading-day";
export type Sentiment = "bullish" | "bearish" | "mixed" | "uncertain";
export type Direction = "bullish" | "bearish" | "uncertain";
export type Importance = "high" | "medium" | "low";
export type ImpactHorizon = "today" | "this_week" | "medium_term";
export type ReasonType = "company_specific" | "sector_driven" | "macro_driven" | "unknown";
export type Priority = "high" | "medium" | "low";

export type SourceUrl = {
  title?: string;
  url: string;
};

export type Report = {
  id: number;
  report_date: string;
  generated_at: string;
  market_session: MarketSession;
  market_summary: string;
  overall_sentiment: Sentiment;
  main_theme: string;
  markdown_summary: string;
  created_at: string;
  updated_at: string;
};

export type TopSignal = {
  id?: number;
  report_id?: number;
  title: string;
  summary: string;
  why_it_matters: string;
  direction: Direction;
  affected_sectors: string[];
  affected_tickers: string[];
  impact_horizon: ImpactHorizon;
  importance_score: number;
  source_urls: SourceUrl[];
};

export type EventCalendarItem = {
  id?: number;
  report_id?: number;
  event_date: string;
  event_name: string;
  event_type: string;
  importance: Importance;
  affected_assets: string[];
  watch_points: string;
  source_urls: SourceUrl[];
};

export type SectorUpdate = {
  id?: number;
  report_id?: number;
  sector_name: string;
  latest_catalysts: string[];
  beneficiary_tickers: string[];
  pressured_tickers: string[];
  watch_signals: string[];
  sentiment: Sentiment;
  source_urls: SourceUrl[];
};

export type MacroSnapshot = {
  id?: number;
  report_id?: number;
  treasury_yields: string;
  dollar_index: string;
  crude_oil: string;
  gold: string;
  vix: string;
  macro_data: string;
  growth_tech_smallcap_impact: string;
  source_urls: SourceUrl[];
};

export type BigDecliner = {
  id?: number;
  report_id?: number;
  ticker: string;
  company_name: string;
  previous_day_change_percent: number;
  volume_note: string;
  reason: string;
  reason_type: ReasonType;
  catalysts: string[];
  watch_points: string;
  source_urls: SourceUrl[];
};

export type WatchlistItem = {
  id?: number;
  report_id?: number;
  symbol_or_sector: string;
  reason_to_watch: string;
  key_trigger: string;
  risk_points: string;
  priority: Priority;
  source_urls: SourceUrl[];
};

export type Source = {
  id?: number;
  report_id?: number;
  title: string;
  url: string;
  publisher: string;
  published_at?: string | null;
  related_section: string;
};

export type FullReport = {
  report: Report;
  topSignals: TopSignal[];
  events: EventCalendarItem[];
  sectors: SectorUpdate[];
  macro: MacroSnapshot | null;
  decliners: BigDecliner[];
  watchlist: WatchlistItem[];
  sources: Source[];
};

export type GeneratedReport = Omit<FullReport, "report"> & {
  report: Omit<Report, "id" | "created_at" | "updated_at">;
};

export type ReportListItem = Report & {
  top_signal_count: number;
  event_count: number;
  decliner_count: number;
  sectors: string[];
};
