export const schema = `
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date TEXT NOT NULL UNIQUE,
  generated_at TEXT NOT NULL,
  market_session TEXT NOT NULL CHECK (market_session IN ('premarket','intraday','afterhours','non-trading-day')),
  market_summary TEXT NOT NULL,
  overall_sentiment TEXT NOT NULL CHECK (overall_sentiment IN ('bullish','bearish','mixed','uncertain')),
  main_theme TEXT NOT NULL,
  markdown_summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS top_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('bullish','bearish','uncertain')),
  affected_sectors TEXT NOT NULL,
  affected_tickers TEXT NOT NULL,
  impact_horizon TEXT NOT NULL CHECK (impact_horizon IN ('today','this_week','medium_term')),
  importance_score INTEGER NOT NULL,
  source_urls TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_calendar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  importance TEXT NOT NULL CHECK (importance IN ('high','medium','low')),
  affected_assets TEXT NOT NULL,
  watch_points TEXT NOT NULL,
  source_urls TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sector_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  sector_name TEXT NOT NULL,
  latest_catalysts TEXT NOT NULL,
  beneficiary_tickers TEXT NOT NULL,
  pressured_tickers TEXT NOT NULL,
  watch_signals TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish','bearish','mixed','uncertain'))
);

CREATE TABLE IF NOT EXISTS macro_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  treasury_yields TEXT NOT NULL,
  dollar_index TEXT NOT NULL,
  crude_oil TEXT NOT NULL,
  gold TEXT NOT NULL,
  vix TEXT NOT NULL,
  macro_data TEXT NOT NULL,
  growth_tech_smallcap_impact TEXT NOT NULL,
  source_urls TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS big_decliners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  previous_day_change_percent REAL NOT NULL,
  volume_note TEXT NOT NULL,
  reason TEXT NOT NULL,
  reason_type TEXT NOT NULL CHECK (reason_type IN ('company_specific','sector_driven','macro_driven','unknown')),
  catalysts TEXT NOT NULL,
  watch_points TEXT NOT NULL,
  source_urls TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  symbol_or_sector TEXT NOT NULL,
  reason_to_watch TEXT NOT NULL,
  key_trigger TEXT NOT NULL,
  risk_points TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high','medium','low'))
);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  publisher TEXT NOT NULL,
  published_at TEXT,
  related_section TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT NOT NULL DEFAULT (datetime('now')),
  report_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('success','error')),
  message TEXT NOT NULL,
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_sentiment ON reports(overall_sentiment);
CREATE INDEX IF NOT EXISTS idx_top_signals_report ON top_signals(report_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON event_calendar(event_date);
CREATE INDEX IF NOT EXISTS idx_decliners_ticker ON big_decliners(ticker);
CREATE INDEX IF NOT EXISTS idx_sources_report ON sources(report_id);
`;
