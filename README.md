# Workout Tracker

A mobile-first, offline-first **PWA** workout tracker for a single user. Its one job: between sets at the gym, instantly show last session's numbers for the current exercise so you know what to beat (progressive overload).

**Live:** https://progressload.vercel.app

## How it works

- **Local-first.** All reads/writes during a workout hit local React state + `localStorage` first — the "last time" lookup never depends on the network (works in a no-signal gym basement).
- **Supabase is sync + durable backup.** On open, hydrate from Supabase and merge by `updatedAt` (last-write-wins). On each change, best-effort `upsert`; if offline, mark `pendingSync` and flush on reconnect.
- **Double progression hint.** Stay at a weight and add reps each week until every working set hits the top of the rep range, then add weight. See `src/lib/progression.ts`.

## Stack

Next.js 15 (App Router, client-rendered logging path) · TypeScript · Tailwind v4 · Supabase (Postgres + magic-link Auth) · `localStorage` · hand-rolled service worker + web manifest. Deployed on Vercel.

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
pnpm dev
```

Env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The app is fully usable without Supabase configured (offline mode with seed data) — auth/sync just no-op.

## Database

One table (`sessions`) with row-level security keyed to `auth.uid()`. Apply the migration to your Supabase Postgres:

```bash
psql "$POSTGRES_URL_NON_POOLING" -f supabase/migrations/0001_init.sql
```

Templates and exercises are hardcoded config (`src/config/templates.ts`) — editing that file changes the routine; there is no in-app creation UI by design.

## Auth note

Magic-link sign-in requires the production URL in Supabase → Authentication → URL Configuration:

- **Site URL:** `https://progressload.vercel.app`
- **Redirect URLs:** `https://progressload.vercel.app/**`

## Tests

```bash
pnpm test    # vitest — progression logic (the core)
```

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm test` / `pnpm test:watch`
- `pnpm lint`
