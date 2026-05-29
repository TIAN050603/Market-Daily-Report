import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

type ReportFile = {
  date: string;
  data: Record<string, unknown>;
};

const reportsDir = path.join(process.cwd(), "data", "reports");

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function normalize(value: unknown): string {
  return JSON.stringify(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s%.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(value.split(" ").filter((token) => token.length > 1));
}

function jaccard(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }
  return intersection / new Set([...left, ...right]).size;
}

function sectionText(report: ReportFile, section: string) {
  const data = report.data;
  switch (section) {
    case "main":
      return normalize({
        main_theme: (data.report as Record<string, unknown> | undefined)?.main_theme,
        market_summary: (data.report as Record<string, unknown> | undefined)?.market_summary
      });
    case "topSignals":
      return normalize(asArray(data.topSignals).map((item) => ({
        title: item.title,
        summary: item.summary,
        why: item.why_it_matters,
        sectors: item.affected_sectors,
        tickers: item.affected_tickers
      })));
    case "events":
      return normalize(asArray(data.events).map((item) => ({
        date: item.event_date,
        name: item.event_name,
        type: item.event_type,
        importance: item.importance,
        watch: item.watch_points
      })));
    case "sectors":
      return normalize(asArray(data.sectors).map((item) => ({
        sector: item.sector_name,
        catalysts: item.latest_catalysts,
        beneficiaries: item.beneficiary_tickers,
        pressured: item.pressured_tickers,
        watch: item.watch_signals
      })));
    case "macro":
      return normalize(data.macro || {});
    case "decliners":
      return normalize(asArray(data.decliners).map((item) => ({
        ticker: item.ticker,
        change: item.previous_day_change_percent,
        reason: item.reason,
        catalysts: item.catalysts,
        watch: item.watch_points
      })));
    case "watchlist":
      return normalize(asArray(data.watchlist).map((item) => ({
        symbol: item.symbol_or_sector,
        reason: item.reason_to_watch,
        trigger: item.key_trigger,
        risk: item.risk_points,
        priority: item.priority
      })));
    case "narratives":
      return normalize(asArray(data.narratives).map((item) => ({
        title: item.title,
        event_date: item.event_date,
        thesis: item.thesis,
        watch: item.what_to_watch,
        tickers: item.beneficiary_tickers
      })));
    default:
      return "";
  }
}

function titles(report: ReportFile, section: string, key: string) {
  return asArray(report.data[section]).map((item) => normalize(item[key])).filter(Boolean);
}

function loadReports() {
  if (!existsSync(reportsDir)) return [];
  return readdirSync(reportsDir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .map((name) => ({
      date: name.slice(0, 10),
      data: JSON.parse(readFileSync(path.join(reportsDir, name), "utf8")) as Record<string, unknown>
    }));
}

const reports = loadReports();
const sections = ["main", "topSignals", "events", "sectors", "macro", "decliners", "watchlist", "narratives"];
const thresholds: Record<string, number> = {
  main: 0.88,
  topSignals: 0.82,
  events: 0.99,
  sectors: 0.92,
  macro: 0.88,
  decliners: 0.94,
  watchlist: 0.82,
  narratives: 0.88
};

const failures: string[] = [];
const warnings: string[] = [];

for (let index = 1; index < reports.length; index += 1) {
  const previous = reports[index - 1];
  const current = reports[index];

  for (const section of sections) {
    const previousText = sectionText(previous, section);
    const currentText = sectionText(current, section);
    if (!previousText || !currentText) continue;

    const similarity = jaccard(previousText, currentText);
    const message = `${previous.date} vs ${current.date} ${section}: ${(similarity * 100).toFixed(1)}%`;
    if (similarity >= thresholds[section]) {
      failures.push(message);
    } else if (section !== "events" && similarity >= Math.max(0.65, thresholds[section] - 0.12)) {
      warnings.push(message);
    }
  }

  const repeatedTopSignals = titles(previous, "topSignals", "title").filter((title) => titles(current, "topSignals", "title").includes(title));
  if (repeatedTopSignals.length) {
    failures.push(`${previous.date} vs ${current.date} repeated top signal titles: ${repeatedTopSignals.join(" | ")}`);
  }

  const repeatedNarratives = titles(previous, "narratives", "title").filter((title) => titles(current, "narratives", "title").includes(title));
  if (repeatedNarratives.length > 2) {
    failures.push(`${previous.date} vs ${current.date} repeated narrative titles: ${repeatedNarratives.join(" | ")}`);
  }
}

if (warnings.length) {
  console.warn("Duplicate-content audit warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error("Duplicate-content audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Duplicate-content audit passed for ${reports.length} reports.`);
