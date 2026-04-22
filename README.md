# Forex Sentiment Comparison Dashboard

Single-page forex analysis terminal built with `Express.js`, `React`, `Tailwind CSS`, `Socket.IO`, `Albert Sans`, and a database layer that defaults to `SQLite` for demo use.

## Stack

- Frontend: React + Vite + Tailwind CSS + Lightweight Charts
- Backend: Express.js + JWT auth + Socket.IO + Knex
- Database: SQLite by default, portable to MySQL or PostgreSQL through the same migration/query layer
- Realtime demo data: simulated market engine aligned to the PRD widgets

## Project Structure

```text
client/            React dashboard UI
server/            Express API, JWT auth, Socket.IO, SQLite-backed demo data
server/migrations/ Portable schema migrations for SQLite/MySQL/PostgreSQL
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp server/.env.example server/.env
```

3. Start development mode:

```bash
npm run dev
```

4. Open `http://localhost:5173`

## Database

- Default demo database: `server/data/forex-sentiment.sqlite`
- Migrations run automatically when the server starts
- Manual migration command:

```bash
npm run db:migrate -w server
```

### Default SQLite Environment

```env
DB_CLIENT=better-sqlite3
DB_FILENAME=./data/forex-sentiment.sqlite
```

### Switch To PostgreSQL Later

```env
DB_CLIENT=pg
DATABASE_URL=postgres://user:password@localhost:5432/forex_sentiment
```

### Switch To MySQL Later

```env
DB_CLIENT=mysql2
DATABASE_URL=mysql://user:password@localhost:3306/forex_sentiment
```

The schema and repositories use Knex so the app can keep the same migration/query layer while changing only the connection driver.

## Demo Login

- Email: `demo@forex.local`
- Username: `demo`
- Password: `demo123`

## Scripts

- `npm run dev` starts backend and frontend together
- `npm run build` builds the React app and checks the Express entry file
- `npm run start` serves the backend on port `4000`

## Current Scope

This setup includes:

- secure login screen with JWT session handling
- SQLite-backed demo users, prices, and sentiments
- remember me persistence with `localStorage` / `sessionStorage`
- global pair selector
- live price chart with news event overlays
- retail sentiment comparison bars
- news mood gauge
- mini economic calendar
- anomaly alert card
- source freshness indicator

## Next Integration Steps

1. Replace the simulated market engine in `server/src/data/marketStore.js` with real integrations for Myfxbook, FXSSI, Finnhub, and EODHD.
2. Add Redis caching in front of EODHD and scraper jobs to reduce rate-limit pressure.
3. Extend the current SQLite demo storage to production-grade MySQL or PostgreSQL by updating only `DB_CLIENT` and `DATABASE_URL`.
