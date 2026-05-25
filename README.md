# Market Intelligence Dashboard

A full-stack dashboard for daily U.S. market intelligence reports, focused on AI infrastructure, semiconductors, optical communication, cloud/software, data center power, macro risk, big decliners, and upcoming market events.

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript
- Backend: Next.js API Routes
- Local storage: SQLite via Node 24 built-in `node:sqlite`
- Public free storage: committed JSON report snapshots for Vercel read-only hosting
- Scheduler: GitHub Actions cron, with local command support
- Data generation: provider interface + mock provider, ready for real APIs

## Project Structure

```text
app/
  api/                         API routes
  reports/                     history and detail pages
components/                    dashboard UI sections
config/watchlist.json          user watchlist
lib/db/                        SQLite repository and file snapshot repository
lib/providers/                 data provider interface and mock provider
lib/reporting/                 report generation, markdown export, date helpers
scripts/                       migration, seed, manual generation commands
.github/workflows/             daily cron workflow
YYYY-MM/                       generated monthly markdown report folders
data/reports/                  committed JSON report snapshots for free public hosting
data/*.db                      local SQLite database, ignored by git
```

## Install

```bash
npm install
```

For local SQLite commands, use Node.js 24 because they rely on the built-in SQLite driver. The free Vercel deployment reads committed JSON snapshots and does not need a writable database.

## Initialize Database

```bash
npm run db:migrate
npm run db:seed
```

The seed command creates a mock report for `2026-05-25`, writes it into SQLite, exports a JSON snapshot under `data/reports/`, and exports a Markdown copy under:

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

For the free public Vercel mode, generate file snapshots with:

```bash
STORAGE_MODE=files npm run reports:generate -- 2026-05-25
```

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

The workflow commits both:

```text
data/reports/YYYY-MM-DD.json
YYYY-MM/YYYY-MM-DD-Daily-US-Market-Intelligence-Report.md
```

When this repository is connected to Vercel, every commit triggers a fresh deployment, so the public website updates after GitHub Actions commits the new report.

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

The UI and APIs do not hardcode report content. Locally they can read SQLite; on Vercel they read committed JSON snapshots from `data/reports/`.

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

It expects structured provider outputs and saves normalized records into SQLite locally and JSON snapshots for free public hosting.

## Free Public Deployment on Vercel

Vercel's Hobby plan is free for personal projects. The free deployment mode in this repo avoids paid databases by reading committed JSON report snapshots.

This repository includes:

```text
vercel.json
data/reports/*.json
```

Vercel deployment steps:

1. Create or sign in to a Vercel account.
2. Click **Add New...** -> **Project**.
3. Import this GitHub repository: `TIAN050603/Market-Daily-Report`.
4. Keep the default Next.js settings.
5. Deploy.
6. Open the generated `.vercel.app` URL on your phone.

The included `vercel.json` sets:

- `STORAGE_MODE=files`
- `npm ci` as install command
- `npm run build` as build command

Important limitation: the Vercel site is read-only. Daily updates come from GitHub Actions committing new JSON/Markdown files, then Vercel auto-deploying the new commit. `POST /api/reports/generate` is mainly for local testing.

To update manually without waiting for the schedule:

```bash
npm run reports:generate -- 2026-05-25
git add data/reports 2026-05/*.md
git commit -m "Add daily market report 2026-05-25"
git push
```

For a more scalable hosted deployment later, replace JSON/SQLite with PostgreSQL and keep the API response shapes unchanged.
