import { generateMarketReport } from "@/lib/reporting/generator";

const date = process.argv[2] || "2026-05-25";

async function main() {
  const report = await generateMarketReport(date);
  console.log(`Seeded report ${report.report.report_date} (#${report.report.id}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
