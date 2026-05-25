export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00Z`) : date;
  return d.toISOString().slice(0, 10);
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00Z`) : new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function getTodayDate(): string {
  return formatDate(new Date());
}

export function getMonthlyReportPath(reportDate: string) {
  const month = reportDate.slice(0, 7);
  return {
    dir: month,
    file: `${reportDate}-Daily-US-Market-Intelligence-Report.md`
  };
}
