# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Build to dist/
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

## Deployment

This repo is connected to Vercel. Every push to `main` triggers a live deployment automatically.

Before making changes, create a backup:
```bash
cp src/App.jsx src/App-working-backup.jsx
```

Then commit and push:
```bash
git add .
git commit -m "Describe the change"
git push
```

## Architecture

The entire application is a single React component (`src/App.jsx`) with no routing or external state management. All state lives in the top-level `GolfLeagueStarterWebsite` component and is persisted to `localStorage` under the key `golf-league-site-data-v5`.

**Data model (all in component state):**
- `teams` — 18 teams, each with `id`, `number`, `name`
- `players` — players with `teamNumber` and `lineupSlot` (1–4)
- `schedule` — matchups per week with `course`, `teamANumber`, `teamBNumber`
- `rounds` — per-player hole-by-hole scores keyed by `playerId` + `week`
- `substitutes` — sub pool organized by lineup slot (1–4)
- `manualPointAdjustments` — admin overrides keyed by team number
- `lockedWeeks` — weeks where scores are finalized

**Scoring system:** Combined stroke play + match play. Each player matchup produces both a total stroke score and a hole-by-hole win count. Points are computed from these results and aggregated into team standings.

**Schedule generation:** `generateBalancedSeasonSchedule()` uses a round-robin algorithm that also balances which course (C-Way vs. Clayton Country Club) each team plays across the season. Hole pars for each course are defined in `COURSE_HOLE_PARS`.

**Access control:** Three password levels hardcoded at the top of App.jsx — admin (`golfadmin123`), score entry (`scoreentry123`), and announcements (`announce123`).

**Weather widget:** Fetches next Wednesday's forecast from open-meteo.com using a fixed lat/lon for the league location (Oswego, NY area).

**Lineup periods:** Players are grouped into 3-week "lineup periods" via `getLineupPeriodStart()`. Foursomes rotate within each period on a 3-pattern cycle.

**No tests.** `runInternalChecks()` at module load runs a few `console.assert` checks inline.
