# Market Intelligence Dashboard

A full-stack dashboard for daily U.S. market intelligence reports, focused on AI infrastructure, semiconductors, optical communication, cloud/software, data center power, macro risk, big decliners, and upcoming market events.

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript
- Backend: Next.js API Routes
- Database: SQLite via Node 24 built-in `node:sqlite`
- Scheduler: GitHub Actions cron, with local command support
- Data generation: provider interface + mock provider, ready for real APIs

## Project Structure

```text
app/
  api/                         API routes
  reports/                     history and detail pages
components/                    dashboard UI sections
config/watchlist.json          user watchlist
lib/db/                        SQLite schema and repository
lib/providers/                 data provider interface and mock provider
lib/reporting/                 report generation, markdown export, date helpers
scripts/                       migration, seed, manual generation commands
.github/workflows/             daily cron workflow
YYYY-MM/                       generated monthly markdown report folders
data/                          local SQLite database, ignored by git
```

## Install

```bash
npm install
```

This project expects Node.js 24 because it uses the built-in SQLite driver.

## Initialize Database

```bash
npm run db:migrate
npm run db:seed
```

The seed command creates a mock report for `2026-05-25`, writes it into SQLite, and exports a Markdown copy under:

```text
2026-05/2026-05-25-Daily-US-Market-Intelligence-Report.md
```

## Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Manual Report Generation

Generate today:

```bash
npm run reports:generate
```

Generate a specific date:

```bash
npm run reports:generate -- 2026-05-25
```

The generator upserts by `report_date`, so rerunning for the same date updates the existing report instead of creating duplicates.

## API

- `GET /api/reports`
- `GET /api/reports/latest`
- `GET /api/reports/:id`
- `GET /api/reports/by-date/:date`
- `GET /api/search?q=NVDA`
- `POST /api/reports/generate`

Protect manual generation in production by setting:

```bash
REPORT_GENERATION_TOKEN=your-token
```

Then call:

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"2026-05-25\"}"
```

## Daily Cron

The included GitHub Actions workflow runs on weekdays at `12:00 UTC`, which maps to about `08:00 ET` during daylight saving time. During standard time, change the cron to `0 13 * * 1-5`.

Workflow file:

```text
.github/workflows/daily-report.yml
```

Generated Markdown is committed under the monthly folder convention:

```text
YYYY-MM/YYYY-MM-DD-Daily-US-Market-Intelligence-Report.md
```

## Current Mock Data

The MVP uses mock data in:

```text
lib/providers/mock-provider.ts
```

Mocked areas:

- market news
- sector news
- earnings calendar
- macro calendar
- Fed calendar
- big decliners
- market prices and volume notes

The UI and APIs do not hardcode report content. They read from SQLite.

## Connecting Real Data Sources

Replace or extend:

```text
lib/providers/index.ts
lib/providers/types.ts
lib/providers/mock-provider.ts
```

Suggested production providers:

- RSS/news provider for market headlines
- SEC filings provider
- earnings calendar provider
- economic calendar provider
- Fed calendar provider
- market data provider for prices, volume, VIX, yields, dollar, oil and gold
- LLM summarizer/classifier provider

Keep the generator contract in:

```text
lib/reporting/generator.ts
```

It expects structured provider outputs and saves normalized records into the database.

## Deployment Notes

For a single-user deployment, SQLite is fine. For multi-user hosted deployment, replace `lib/db` with PostgreSQL-backed queries and keep the API response shapes unchanged.
