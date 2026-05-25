import { logGeneration } from "@/lib/db/reports";
import { generateMarketReport } from "@/lib/reporting/generator";
import { getTodayDate } from "@/lib/reporting/date-utils";

const date = process.argv[2] || process.env.REPORT_DATE || getTodayDate();

async function main() {
  try {
    const report = await generateMarketReport(date);
    console.log(`Generated report ${report.report.report_date} (#${report.report.id}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown report generation error";
    logGeneration(date, "error", message, error instanceof Error ? error.stack : undefined);
    console.error(message);
    process.exit(1);
  }
}

main();
