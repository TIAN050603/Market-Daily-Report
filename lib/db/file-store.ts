import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FullReport, ReportListItem } from "@/lib/types";

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

const reportsDir = () => path.join(process.cwd(), "data", "reports");

export function shouldUseFileStore() {
  return process.env.STORAGE_MODE === "files" || process.env.VERCEL === "1";
}

function readReportFile(filePath: string): FullReport | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as FullReport;
  } catch {
    return null;
  }
}

export function writeReportSnapshot(report: FullReport) {
  const dir = reportsDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${report.report.report_date}.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function readAllReportSnapshots(): FullReport[] {
  const dir = reportsDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readReportFile(path.join(dir, file)))
    .filter((report): report is FullReport => Boolean(report))
    .sort((a, b) => b.report.report_date.localeCompare(a.report.report_date));
}

function matchesQuery(report: FullReport, options: QueryOptions) {
  if (options.from && report.report.report_date < options.from) return false;
  if (options.to && report.report.report_date > options.to) return false;
  if (options.sentiment && report.report.overall_sentiment !== options.sentiment) return false;
  if (options.sector && !report.sectors.some((sector) => sector.sector_name.toLowerCase().includes(options.sector!.toLowerCase()))) {
    return false;
  }
  if (options.importance) {
    const minimum = options.importance === "high" ? 85 : options.importance === "medium" ? 65 : 0;
    if (!report.topSignals.some((signal) => signal.importance_score >= minimum)) return false;
  }
  if (options.q) {
    const q = options.q.toLowerCase();
    const haystack = [
      report.report.market_summary,
      report.report.main_theme,
      report.report.markdown_summary,
      ...report.topSignals.flatMap((item) => [item.title, item.summary, item.affected_tickers.join(" "), item.affected_sectors.join(" ")]),
      ...report.events.flatMap((item) => [item.event_name, item.event_type, item.affected_assets.join(" ")]),
      ...report.sectors.flatMap((item) => [item.sector_name, item.beneficiary_tickers.join(" "), item.pressured_tickers.join(" ")]),
      ...report.decliners.flatMap((item) => [item.ticker, item.company_name, item.reason])
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(q)) return false;
  }
  return true;
}

function toListItem(report: FullReport): ReportListItem {
  return {
    ...report.report,
    top_signal_count: report.topSignals.length,
    event_count: report.events.length,
    decliner_count: report.decliners.length,
    sectors: report.sectors.map((sector) => sector.sector_name)
  };
}

export function getFileReportById(id: number) {
  return readAllReportSnapshots().find((report) => report.report.id === id) ?? null;
}

export function getFileReportByDate(date: string) {
  return readReportFile(path.join(reportsDir(), `${date}.json`));
}

export function getLatestFileReport() {
  return readAllReportSnapshots()[0] ?? null;
}

export function listFileReports(options: QueryOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const filtered = readAllReportSnapshots().filter((report) => matchesQuery(report, options));
  return {
    page,
    pageSize,
    total: filtered.length,
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toListItem)
  };
}

export function searchFileReports(q: string, options: QueryOptions = {}) {
  return listFileReports({ ...options, q, pageSize: options.pageSize ?? 20 });
}
