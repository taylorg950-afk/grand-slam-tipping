# Grand Slam Tipping — Handover

## What this is
A private tennis tipping competition app for ~10 colleagues. Replaces an Excel sheet. Users pick match winners before each match locks, score points per correct tip (doubles each round), and compete on a leaderboard. Admin (Taylor) manages tournaments, fixtures, and results manually.

## Live URL
https://grand-slam-tipping.vercel.app

## Stack
- **Next.js 16** App Router, TypeScript, Tailwind v4
- **Supabase** (Postgres + RLS + Auth + Storage)
- **Vercel** (auto-deploys on push to `main`)
- **Resend** (email provider — not fully set up yet, currently using Supabase's built-in 2/hour limit)

## Design system
Clay/newspaper aesthetic ("The Tipping Post"). Key colours:
- `#FAF6EC` — parchment background
- `#B85433` — clay/terracotta (primary accent)
- `#8E3A1F` — dark clay (hover/gradient end)
- `#1B1814` — near-black text
- `#3C342C` — secondary text
- `#F2EBDC` — card background
- `#3D4F2B` — forest green (correct picks)
- Dotted texture overlay: `radial-gradient(circle at 1px 1px, #1B1814 0.5px, transparent 0)` at 3px spacing, 6% opacity
- Font: DM Sans (body) + Instrument Serif (headings/italic via `font-serif`)

## Current tournament
Italian Open 2026 (`slug: italian-open-2026`). Rounds: R64, R32, R16 entered. QF/SF/F not yet entered.

**Important**: All match `scheduled_start` dates were placeholder (May 17). R64 and R32 have been backdated to May 9, R16 to May 12 so tips are visible to all users. Future rounds need real dates when entered.

## Routes
```
/                              → redirects to /dashboard or /login
/login                         → magic link form
/auth/callback                 → Supabase auth handler
/dashboard                     → main hub (standings, picks status, chart)
/profile                       → edit display name, catchphrase, avatar
/tournaments/[slug]/round/[name]     → pick match winners
/tournaments/[slug]/picks            → all my picks across rounds (tabbed by round)
/tournaments/[slug]/bracket          → visual bracket
/tournaments/[slug]/leaderboard      → full standings
/tournaments/[slug]/tiebreaker       → predict total games in finals

/admin                              → admin dashboard
/admin/tournaments/new              → create tournament
/admin/tournaments/[slug]/rounds/[name]/matches   → add/delete matches
/admin/tournaments/[slug]/rounds/[name]/results   → enter match results
/admin/tournaments/[slug]/import-draw             → import draw from PDF via Claude API
```

## Key files
```
src/app/dashboard/page.tsx                    — main dashboard (server component)
src/app/tournaments/[slug]/round/[name]/page.tsx   — round/tips page
src/app/tournaments/[slug]/round/[name]/MatchCard.tsx  — individual match tip card
src/app/tournaments/[slug]/bracket/BracketView.tsx     — bracket canvas (client component)
src/app/tournaments/[slug]/picks/PicksView.tsx         — picks page (client, round toggle)
src/app/tournaments/[slug]/tiebreaker/TiebreakerForm.tsx — tiebreaker form (client)
src/app/profile/ProfileForm.tsx               — profile/avatar form (client)
src/components/TabBar.tsx                     — bottom nav (Today/Picks/Bracket/Standings/Final)
src/components/charts/CumulativePointsChart.tsx — recharts line chart
src/lib/scoring.ts                            — computeScores() — pure function, no DB
src/lib/require-admin.ts                      — admin auth guard for server actions
```

## Database schema (key tables)
```
users           — id, display_name, is_admin, avatar_url, catchphrase, created_at
tournaments     — id, name, slug, start_date, end_date, is_active
rounds          — id, tournament_id, name (R64/R32/R16/QF/SF/F), points_per_correct_tip, sort_order
matches         — id, round_id, player1_name, player2_name, scheduled_start, winner, draw, bracket_position
tips            — id, user_id, match_id, predicted_winner, created_at, updated_at
tiebreakers     — id, user_id, tournament_id, mens_final_total_games, womens_final_total_games
```

## Scoring
Points double each round: R64=2, R32=4, R16=8, QF=16, SF=32, F=64. Computed live from tips+results, never stored.

## Bracket progression
When admin enters a result via the results page, `advanceBracket()` in `results/actions.ts` automatically populates the winner's name into the correct slot of the next round's match, using `bracket_position`. Formula: `next_position = floor(current_position / 2)`, slot = even → player1, odd → player2.

## Tips locking
Tips lock per-match at `scheduled_start`. RLS enforces this at DB level. Other users' tips only become visible after a match locks (prevents copying).

## Auth
Magic link only (no passwords). Supabase built-in email — rate limited to 2/hour on free tier. To invite users: send magic links one at a time from Supabase dashboard → Authentication → Users, or wait between sends.

**Supabase Site URL** must be set to `https://grand-slam-tipping.vercel.app` in Authentication → URL Configuration for magic links to work on production.

## Avatar storage
Supabase Storage bucket `avatars` (public). Images stored at `{user_id}/avatar`. RLS: users can only write to their own folder.

## Pending / known issues
1. **Email setup** — Resend SMTP configured but sender domain not verified. Currently falling back to Supabase built-in (2/hour). Need to buy a domain or verify one with Resend for bulk invites.
2. **Button affordance** — Tap targets on the round/picks page could be larger and clearer on mobile. Player selection buttons are subtle.
3. **History page** — `/history` route listed in PROJECT.md but not built yet.
4. **Tiebreaker lock** — currently only locks on men's final start; should also lock on women's final start.
5. **Scheduled_start dates** — need to be set to real match times when entering future rounds (QF/SF/F).
6. **Roland Garros** — next tournament to set up after Italian Open wraps.

## Environment variables (Vercel + local .env.local)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```

## GitHub
https://github.com/taylorg950-afk/grand-slam-tipping (public repo)

## Key conventions
- Australian English in all UI copy
- Server components for data fetching, client components only when needed (forms, toggles, charts)
- All admin server actions protected by `requireAdmin()` from `src/lib/require-admin.ts`
- All authenticated pages redirect to `/login` if no session
- `bracket_position` is 0-indexed, set on all matches, drives bracket layout and advancement
- Player names stored with seed in brackets e.g. `Jannik Sinner [1]` — strip with `name.replace(/\s*\[.*?\]/, '').trim()` for display
