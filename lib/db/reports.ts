import {
  BigDecliner,
  EventCalendarItem,
  FullReport,
  GeneratedReport,
  MacroSnapshot,
  Report,
  ReportListItem,
  SectorUpdate,
  Source,
  TopSignal,
  WatchlistItem
} from "@/lib/types";
import { getDatabase, json, migrate, parseJson } from "./connection";
import {
  getFileReportByDate,
  getFileReportById,
  getLatestFileReport,
  listFileReports,
  searchFileReports,
  shouldUseFileStore
} from "./file-store";

type QueryOptions = {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  q?: string;
  sentiment?: string;
  sector?: string;
  importance?: string;
};

function rowToReport(row: Record<string, unknown>): Report {
  return row as unknown as Report;
}

function rowToSignal(row: Record<string, unknown>): TopSignal {
  return {
    ...(row as unknown as TopSignal),
    affected_sectors: parseJson<string[]>(row.affected_sectors, []),
    affected_tickers: parseJson<string[]>(row.affected_tickers, []),
    source_urls: parseJson(row.source_urls, [])
  };
}

function rowToEvent(row: Record<string, unknown>): EventCalendarItem {
  return {
    ...(row as unknown as EventCalendarItem),
    affected_assets: parseJson<string[]>(row.affected_assets, []),
    source_urls: parseJson(row.source_urls, [])
  };
}

function rowToSector(row: Record<string, unknown>): SectorUpdate {
  return {
    ...(row as unknown as SectorUpdate),
    latest_catalysts: parseJson<string[]>(row.latest_catalysts, []),
    beneficiary_tickers: parseJson<string[]>(row.beneficiary_tickers, []),
    pressured_tickers: parseJson<string[]>(row.pressured_tickers, []),
    watch_signals: parseJson<string[]>(row.watch_signals, [])
  };
}

function rowToMacro(row: Record<string, unknown>): MacroSnapshot {
  return {
    ...(row as unknown as MacroSnapshot),
    source_urls: parseJson(row.source_urls, [])
  };
}

function rowToDecliner(row: Record<string, unknown>): BigDecliner {
  return {
    ...(row as unknown as BigDecliner),
    catalysts: parseJson<string[]>(row.catalysts, []),
    source_urls: parseJson(row.source_urls, [])
  };
}

function rowToSource(row: Record<string, unknown>): Source {
  return row as unknown as Source;
}

export function upsertReport(input: GeneratedReport): FullReport {
  if (shouldUseFileStore()) {
    const now = new Date().toISOString();
    return {
      report: {
        ...input.report,
        id: Number(input.report.report_date.replaceAll("-", "")),
        created_at: now,
        updated_at: now
      },
      topSignals: input.topSignals,
      events: input.events,
      sectors: input.sectors,
      macro: input.macro,
      decliners: input.decliners,
      watchlist: input.watchlist,
      sources: input.sources
    };
  }

  migrate();
  const db = getDatabase();
  const existing = db.prepare("SELECT id FROM reports WHERE report_date = ?").get(input.report.report_date);
  let reportId: number;

  if (existing?.id) {
    reportId = Number(existing.id);
    db.prepare(
      `UPDATE reports
       SET generated_at = ?, market_session = ?, market_summary = ?, overall_sentiment = ?,
           main_theme = ?, markdown_summary = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      input.report.generated_at,
      input.report.market_session,
      input.report.market_summary,
      input.report.overall_sentiment,
      input.report.main_theme,
      input.report.markdown_summary,
      reportId
    );

    for (const table of [
      "top_signals",
      "event_calendar",
      "sector_updates",
      "macro_snapshots",
      "big_decliners",
      "watchlist_items",
      "sources"
    ]) {
      db.prepare(`DELETE FROM ${table} WHERE report_id = ?`).run(reportId);
    }
  } else {
    const result = db.prepare(
      `INSERT INTO reports
       (report_date, generated_at, market_session, market_summary, overall_sentiment, main_theme, markdown_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.report.report_date,
      input.report.generated_at,
      input.report.market_session,
      input.report.market_summary,
      input.report.overall_sentiment,
      input.report.main_theme,
      input.report.markdown_summary
    );
    reportId = Number(result.lastInsertRowid);
  }

  const insertSignal = db.prepare(
    `INSERT INTO top_signals
     (report_id, title, summary, why_it_matters, direction, affected_sectors, affected_tickers,
      impact_horizon, importance_score, source_urls)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  input.topSignals.forEach((item) =>
    insertSignal.run(
      reportId,
      item.title,
      item.summary,
      item.why_it_matters,
      item.direction,
      json(item.affected_sectors),
      json(item.affected_tickers),
      item.impact_horizon,
      item.importance_score,
      json(item.source_urls)
    )
  );

  const insertEvent = db.prepare(
    `INSERT INTO event_calendar
     (report_id, event_date, event_name, event_type, importance, affected_assets, watch_points, source_urls)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  input.events.forEach((item) =>
    insertEvent.run(
      reportId,
      item.event_date,
      item.event_name,
      item.event_type,
      item.importance,
      json(item.affected_assets),
      item.watch_points,
      json(item.source_urls)
    )
  );

  const insertSector = db.prepare(
    `INSERT INTO sector_updates
     (report_id, sector_name, latest_catalysts, beneficiary_tickers, pressured_tickers, watch_signals, sentiment)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  input.sectors.forEach((item) =>
    insertSector.run(
      reportId,
      item.sector_name,
      json(item.latest_catalysts),
      json(item.beneficiary_tickers),
      json(item.pressured_tickers),
      json(item.watch_signals),
      item.sentiment
    )
  );

  if (input.macro) {
    db.prepare(
      `INSERT INTO macro_snapshots
       (report_id, treasury_yields, dollar_index, crude_oil, gold, vix, macro_data,
        growth_tech_smallcap_impact, source_urls)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      reportId,
      input.macro.treasury_yields,
      input.macro.dollar_index,
      input.macro.crude_oil,
      input.macro.gold,
      input.macro.vix,
      input.macro.macro_data,
      input.macro.growth_tech_smallcap_impact,
      json(input.macro.source_urls)
    );
  }

  const insertDecliner = db.prepare(
    `INSERT INTO big_decliners
     (report_id, ticker, company_name, previous_day_change_percent, volume_note, reason,
      reason_type, catalysts, watch_points, source_urls)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  input.decliners.forEach((item) =>
    insertDecliner.run(
      reportId,
      item.ticker,
      item.company_name,
      item.previous_day_change_percent,
      item.volume_note,
      item.reason,
      item.reason_type,
      json(item.catalysts),
      item.watch_points,
      json(item.source_urls)
    )
  );

  const insertWatch = db.prepare(
    `INSERT INTO watchlist_items
     (report_id, symbol_or_sector, reason_to_watch, key_trigger, risk_points, priority)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  input.watchlist.forEach((item) =>
    insertWatch.run(reportId, item.symbol_or_sector, item.reason_to_watch, item.key_trigger, item.risk_points, item.priority)
  );

  const insertSource = db.prepare(
    `INSERT INTO sources (report_id, title, url, publisher, published_at, related_section)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  input.sources.forEach((item) =>
    insertSource.run(reportId, item.title, item.url, item.publisher, item.published_at ?? null, item.related_section)
  );

  logGeneration(input.report.report_date, "success", "Report generated", `report_id=${reportId}`);
  const saved = getReportById(reportId);
  if (!saved) throw new Error("Report save failed");
  return saved;
}

export function getReportById(id: number): FullReport | null {
  if (shouldUseFileStore()) return getFileReportById(id);

  migrate();
  const db = getDatabase();
  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(id);
  if (!report) return null;

  return {
    report: rowToReport(report),
    topSignals: db.prepare("SELECT * FROM top_signals WHERE report_id = ? ORDER BY importance_score DESC, id ASC").all(id).map(rowToSignal),
    events: db.prepare("SELECT * FROM event_calendar WHERE report_id = ? ORDER BY importance DESC, event_date ASC, id ASC").all(id).map(rowToEvent),
    sectors: db.prepare("SELECT * FROM sector_updates WHERE report_id = ? ORDER BY id ASC").all(id).map(rowToSector),
    macro: (() => {
      const row = db.prepare("SELECT * FROM macro_snapshots WHERE report_id = ?").get(id);
      return row ? rowToMacro(row) : null;
    })(),
    decliners: db.prepare("SELECT * FROM big_decliners WHERE report_id = ? ORDER BY previous_day_change_percent ASC").all(id).map(rowToDecliner),
    watchlist: db.prepare("SELECT * FROM watchlist_items WHERE report_id = ? ORDER BY priority ASC, id ASC").all(id) as unknown as WatchlistItem[],
    sources: db.prepare("SELECT * FROM sources WHERE report_id = ? ORDER BY id ASC").all(id).map(rowToSource)
  } satisfies FullReport;
}

export function getReportByDate(date: string): FullReport | null {
  if (shouldUseFileStore()) return getFileReportByDate(date);

  migrate();
  const row = getDatabase().prepare("SELECT id FROM reports WHERE report_date = ?").get(date);
  return row?.id ? getReportById(Number(row.id)) : null;
}

export function getLatestReport(): FullReport | null {
  if (shouldUseFileStore()) return getLatestFileReport();

  migrate();
  const row = getDatabase().prepare("SELECT id FROM reports ORDER BY report_date DESC, generated_at DESC LIMIT 1").get();
  return row?.id ? getReportById(Number(row.id)) : null;
}

export function listReports(options: QueryOptions = {}) {
  if (shouldUseFileStore()) return listFileReports(options);

  migrate();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const params: unknown[] = [];
  const where: string[] = [];

  if (options.from) {
    where.push("r.report_date >= ?");
    params.push(options.from);
  }
  if (options.to) {
    where.push("r.report_date <= ?");
    params.push(options.to);
  }
  if (options.sentiment) {
    where.push("r.overall_sentiment = ?");
    params.push(options.sentiment);
  }
  if (options.q) {
    where.push(`(
      r.market_summary LIKE ? OR r.main_theme LIKE ? OR r.markdown_summary LIKE ? OR
      EXISTS (SELECT 1 FROM big_decliners b WHERE b.report_id = r.id AND (b.ticker LIKE ? OR b.company_name LIKE ? OR b.reason LIKE ?)) OR
      EXISTS (SELECT 1 FROM sector_updates s WHERE s.report_id = r.id AND s.sector_name LIKE ?) OR
      EXISTS (SELECT 1 FROM event_calendar e WHERE e.report_id = r.id AND e.event_name LIKE ?)
    )`);
    const like = `%${options.q}%`;
    params.push(like, like, like, like, like, like, like, like);
  }
  if (options.sector) {
    where.push("EXISTS (SELECT 1 FROM sector_updates s WHERE s.report_id = r.id AND s.sector_name LIKE ?)");
    params.push(`%${options.sector}%`);
  }
  if (options.importance) {
    where.push("EXISTS (SELECT 1 FROM top_signals t WHERE t.report_id = r.id AND t.importance_score >= ?)");
    params.push(options.importance === "high" ? 85 : options.importance === "medium" ? 65 : 0);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT r.*,
        (SELECT COUNT(*) FROM top_signals WHERE report_id = r.id) as top_signal_count,
        (SELECT COUNT(*) FROM event_calendar WHERE report_id = r.id) as event_count,
        (SELECT COUNT(*) FROM big_decliners WHERE report_id = r.id) as decliner_count,
        (SELECT json_group_array(sector_name) FROM sector_updates WHERE report_id = r.id) as sectors
       FROM reports r
       ${whereSql}
       ORDER BY r.report_date DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM reports r ${whereSql}`).get(...params);
  return {
    page,
    pageSize,
    total: Number(totalRow?.total ?? 0),
    items: rows.map((row) => ({
      ...(rowToReport(row) as ReportListItem),
      top_signal_count: Number(row.top_signal_count ?? 0),
      event_count: Number(row.event_count ?? 0),
      decliner_count: Number(row.decliner_count ?? 0),
      sectors: parseJson<string[]>(row.sectors, [])
    }))
  };
}

export function searchReports(q: string, options: QueryOptions = {}) {
  if (shouldUseFileStore()) return searchFileReports(q, options);

  return listReports({ ...options, q, pageSize: options.pageSize ?? 20 });
}

export function logGeneration(reportDate: string | null, status: "success" | "error", message: string, details?: string) {
  if (shouldUseFileStore()) {
    console.log(JSON.stringify({ reportDate, status, message, details }));
    return;
  }

  migrate();
  getDatabase()
    .prepare("INSERT INTO generation_logs (report_date, status, message, details) VALUES (?, ?, ?, ?)")
    .run(reportDate, status, message, details ?? null);
}
