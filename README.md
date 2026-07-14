# Watchlog

A personal, dynamic log of every movie and series you've watched — plus what's next — sorted by release year, with high-res posters pulled live from TMDB.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- **Prisma 7** + **Postgres** (Neon in production)
- **TMDB API** for search, posters, metadata, and India-prioritized watch-provider links
- Deployed on **Vercel**; catalog refresh runs every 6 hours via a GitHub Actions scheduled workflow (Vercel's free tier only allows daily cron, so this runs outside it)

## Local development

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a local or remote Postgres connection string
   - `TMDB_API_KEY` — a TMDB **API Read Access Token** (Settings → API on themoviedb.org)
   - `CRON_SECRET` — any random string, used to authorize `/api/cron/refresh`
2. Install dependencies and set up the database:
   ```bash
   npm install
   npx prisma migrate dev
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

## How it works

- **Watched** / **Watchlist** — search TMDB from the header search bar, add a result to either list. Grid is grouped by release year, newest first.
- **Discover** — a trending row, cached in the DB and refreshed periodically so it's never empty.
- **Click a poster** — opens the best available "watch" link (India region prioritized, falling back to US/UK, then a Google search) in a new tab.
- **`/api/cron/refresh`** — re-fetches metadata for every saved title and repopulates the trending cache. Protected by `CRON_SECRET` (sent as a Bearer token). Triggered every 6 hours by `.github/workflows/refresh-catalog.yml`, which needs two repo secrets: `APP_URL` (the deployed site URL) and `CRON_SECRET` (matching the one set in Vercel).

## Deployment

Deployed via Vercel, connected to this GitHub repo for auto-deploy on push to `main`. Required production environment variables: `DATABASE_URL`, `TMDB_API_KEY`, `CRON_SECRET`.
