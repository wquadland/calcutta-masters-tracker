# Calcutta Golf Tournament Tracker

A real-time tournament management app built for a Calcutta-style golf auction, used live during the 2026 Masters. Participants draft teams of PGA Tour players and compete for prize payouts based on tournament performance, with a bonus points system that triggers on notable scoring events.

## What is a Calcutta?

A Calcutta is a golf betting format where participants bid on teams of professional golfers in an auction. Prize money is distributed based on final tournament standings. This app layered a bonus points mechanic on top — eagles and birdies on designated holes trigger real-time point assignments between participants.

## Features

- **Live leaderboard** — Pulls live scoring data from the ESPN API, auto-refreshing every 60 seconds
- **Calcutta standings** — Ranks the 8 participant teams by their golfers' cumulative scores in real-time
- **Bonus points system** — Eagles and birdies on designated holes per round auto-detect via ESPN hole-by-hole data and surface as pending events for participants to assign
- **Points tracker** — Tracks pending and redeemed points per participant with a full history log
- **Admin panel** — SMS OTP-authenticated (Twilio Verify) panel for logging and managing point events
- **Prize breakdown** — Live prize pool display with round-leader payouts updated as the tournament progresses

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Twilio Verify (SMS OTP) |
| Hosting | Vercel (Fluid Compute) |
| Data | ESPN Core API (live scoring) |

## Architecture

```
app/
├── api/
│   ├── leaderboard/          # Proxies + transforms ESPN leaderboard data (1min cache)
│   ├── pending-points/       # Detects qualifying scoring events via ESPN hole linescores
│   ├── points/               # CRUD for bonus point events (Supabase)
│   ├── point-redemption-log/ # Tracks point redemption history
│   └── auth/                 # Twilio OTP send + verify
├── page.tsx                  # Main app shell, polling + state management
components/
├── TournamentLeaderboard     # Live PGA Tour standings
├── CalcuttaLeaderboard       # Team rankings by golfer scores
├── PointsEarnedPanel         # Points leaders + prize breakdown
├── PointsTracker             # Per-member points tracker with redemption UI
├── PointsAdminModal          # Authenticated event logging panel
└── PointsEditModal           # Edit/delete individual events
lib/
├── calcutta-data.ts          # Team rosters and prize structure
├── points-rules.ts           # Bonus point trigger rules per round
└── espn-api.ts               # ESPN data fetching and transformation
```

## Key Technical Details

**Auto-detection of scoring events** — The `/api/pending-points` route fetches hole-by-hole linescores for every Calcutta golfer in parallel, cross-references against designated birdie/eagle holes per round, and diffs against already-logged events to surface only unhandled triggers. Each qualifying event generates one slot per team member with an `alreadyLogged` flag.

**Duplicate prevention** — Optimistic local state immediately marks a slot as logged on submit, preventing double-submission before the server responds. The API route uses `revalidate: 0` to ensure fresh DB reads on every request.

**OTP authentication** — Participants authenticate via SMS code (Twilio Verify) before logging events. Auth state is persisted in `localStorage` for the session.

## Live Demo

The app is deployed and publicly accessible at:

**[https://calcutta-app-kappa.vercel.app](https://calcutta-app-kappa.vercel.app)**

The live version pulls scoring from the ESPN API and persists data to Supabase. To explore the admin panel without a registered phone number, open it via the ⭐ button and click **Continue as Demo** — this bypasses SMS OTP and loads a set of example scoring events you can assign and log. In the real deployment, each participant authenticates with a 6-digit SMS code via Twilio Verify before logging events.

## Local Development

```bash
npm install
```

Create a `.env.local` with the following keys:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

```bash
npm run dev
```

## Database Schema

```sql
-- Bonus point events
create table point_events (
  id uuid primary key default gen_random_uuid(),
  golfer text not null,
  reason text not null,
  round integer not null,
  hole integer not null,
  earned_by_team text not null,
  assigned_by_member text,
  assigned_to text not null,
  is_complete boolean default false,
  created_at timestamptz default now()
);

-- Point redemption history
create table point_redemption_log (
  id uuid primary key default gen_random_uuid(),
  point_event_id uuid references point_events(id),
  member text not null,
  action text not null,
  pending_after integer not null,
  complete_after integer not null,
  created_at timestamptz default now()
);
```
