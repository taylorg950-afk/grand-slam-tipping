# Grand Slam Tipping Competition

A small private tipping competition for ~10 colleagues, run across the four tennis Grand Slams each year. Replaces an existing Excel-based comp.

## Goals

- Each user picks the winner of every match in each round of each Slam.
- Points are awarded per correct tip, weighted by round.
- Live(ish) leaderboard, viewable by all users.
- Lock tips at match start (so people can't tip retrospectively).
- Magic-link auth — no passwords.
- Admin (me) manages tournaments, fixtures, and results.

## Non-goals (v1)

- Other sports (tennis Slams only — but schema should not actively prevent extension later).
- Public/open competition (private, invite-only via magic link).
- Native mobile app (mobile-responsive web is enough).
- Live point-by-point scoring (match-level winner is all we need).
- Automated match data ingestion — manual entry by admin in v1. See "Future" below.

## Tech stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Next.js Route Handlers + Server Actions.
- **Database:** Supabase (Postgres) with Row Level Security.
- **Auth:** Supabase Auth, magic-link email only.
- **Hosting:** Vercel (free tier).
- **Repo:** Private GitHub repo, deploy on push to `main`.

Rationale: matches existing Vault stack so deployment, secrets management, and Supabase patterns are already familiar.

## Users & roles

- **Admin** (single user — me): full CRUD on tournaments, rounds, matches, results.
- **Tipper:** can submit/edit own tips before lock; view own tips, leaderboard, history.
- **Public (unauthenticated):** can view leaderboard only, optional. Default = login required.

Role is a boolean `is_admin` on the user profile, not a separate role table — overkill for one admin.

## Scoring rules

Points per correct tip, by round (Grand Slam, men's and women's singles draws of 128):

| Round | Matches per draw | Points per correct tip |
|-------|------------------|------------------------|
| R1    | 64               | 1                      |
| R2    | 32               | 2                      |
| R3    | 16               | 3                      |
| R4    | 8                | 4                      |
| QF    | 4                | 6                      |
| SF    | 2                | 8                      |
| F     | 1                | 12                     |

> **TODO for Taylor:** confirm these against your existing Excel sheet — paste the actual round weights into a `SCORING.md` so they become canonical. The above are placeholder values.

Scoring is computed dynamically from `tips` and `match_results` — never stored as a denormalised "points" column on tips. Single source of truth.

## Lock-in policy

- Tips lock **per-match**, at the match's `scheduled_start_time`.
- A user can edit a tip any number of times before lock.
- After lock, the tip is immutable for everyone (including admin — admin can override only via direct DB access for genuine errors, with audit log).
- Server-side enforcement on every write (don't trust the client).

## Tiebreaker

To break ties on final leaderboard:

1. **Primary tiebreaker:** predict total games played in the men's singles final (e.g. a 6-4 6-3 6-2 final = 27 games).
2. **Secondary:** predict total games in the women's singles final.
3. **Tertiary:** earliest tip submission timestamp for the men's final.

Tiebreaker predictions submitted any time before the men's final starts. Stored as integers on a `tiebreakers` table keyed by `(user_id, tournament_id)`.

## Match data

**v1 — Manual entry by admin.** Workflow:
1. Day before round starts, admin opens "Add round fixtures" page.
2. Pastes/types match list (player1, player2, scheduled_start).
3. After each match, admin enters the winner.

**Future (v2 candidates), in priority order:**
1. Scrape Wikipedia tournament draw pages (e.g. `2027_Australian_Open_–_Men's_singles`). Predictable HTML tables, updated within hours, no API costs. Run as a daily scheduled function (Vercel cron) that proposes results for admin to confirm rather than auto-applying.
2. api-tennis.com or similar low-cost API (only if scraping breaks).
3. Goalserve / paid APIs ($150+/month) — not worth it for this scale.

## Update frequency

Leaderboard updates on every page load (computed live from materialised view or a simple SQL aggregation — at this scale, no caching needed). Match results visible immediately on entry. No need for websockets or real-time pushes.

## Schema (initial draft)

```
users (extends Supabase auth.users)
├── id (uuid, FK to auth.users)
├── display_name (text)
├── is_admin (bool, default false)
└── created_at

tournaments
├── id (uuid)
├── name (text) — e.g. "Australian Open 2027"
├── slug (text, unique) — e.g. "ao-2027"
├── start_date (date)
├── end_date (date)
├── is_active (bool) — only one active at a time, ideally
└── created_at

rounds
├── id (uuid)
├── tournament_id (FK)
├── name (text) — "R1", "R2", ..., "F"
├── points_per_correct_tip (int)
├── sort_order (int)
└── created_at

matches
├── id (uuid)
├── round_id (FK)
├── player1_name (text)
├── player2_name (text)
├── scheduled_start (timestamptz)  -- this is the lock time
├── winner (text, nullable) -- 'player1' | 'player2' | null
├── draw (text) -- 'mens' | 'womens'  -- so we can extend to other draws later if wanted
└── created_at

tips
├── id (uuid)
├── user_id (FK)
├── match_id (FK)
├── predicted_winner (text) -- 'player1' | 'player2'
├── created_at
├── updated_at
└── UNIQUE (user_id, match_id)

tiebreakers
├── id (uuid)
├── user_id (FK)
├── tournament_id (FK)
├── mens_final_total_games (int, nullable)
├── womens_final_total_games (int, nullable)
├── created_at
├── updated_at
└── UNIQUE (user_id, tournament_id)
```

### Row Level Security

- `users`: anyone authenticated can read display_name + id; only the user can update their own row.
- `tournaments`, `rounds`, `matches`: anyone authenticated can read; only admin can write.
- `tips`: a user can read all tips for matches that have already locked (so people can compare); a user can read their own tips at any time; a user can write their own tips only if the match has not yet locked. Admin can read all.
- `tiebreakers`: same pattern as tips.

## Pages / routes

```
/                           → if logged in: dashboard, else: login
/login                      → magic link form
/auth/callback              → Supabase auth handler
/dashboard                  → current round, my tips status, leaderboard snippet
/tournaments/[slug]         → tournament detail, all rounds, leaderboard
/tournaments/[slug]/round/[name]   → round detail, all matches, my tips form
/tournaments/[slug]/leaderboard    → full leaderboard with breakdown
/tournaments/[slug]/tiebreaker     → submit tiebreaker prediction
/history                    → all past tournaments

/admin                      → admin dashboard (gated by is_admin)
/admin/tournaments/new
/admin/tournaments/[slug]/rounds/[name]/matches
/admin/tournaments/[slug]/rounds/[name]/results
```

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    -- server-only, for admin operations
```

## Build order (proposed)

1. Scaffold Next.js + Supabase, env vars, basic layout.
2. Schema + migrations + RLS policies.
3. Magic-link auth + user profile creation trigger.
4. Admin: create tournament + rounds (with default Slam round weights as a one-click preset).
5. Admin: add matches to a round.
6. Tipper: view round, submit tips, lock enforcement.
7. Admin: enter results.
8. Leaderboard view (SQL).
9. Tiebreaker flow.
10. History page.
11. Polish, mobile pass, deploy.

Each step should be reviewable independently — no "build me everything" prompts.

## Open questions

- Do you want tipping to be open all at once when a round's fixtures are published, or do you want a "round opens 24 hours before first match" rule? (Currently: open as soon as match exists, locks per-match at start time.) - open 24 hours before first match. 
- Should other tippers be able to see your tip *before* the match locks, or only after? (Recommended: only after lock — prevents copying. Currently assumed.) - only after lock
- Do you want push/email notifications when a new round is published? (Probably not for v1; nice-to-have.) - not for v1
- Australian Open 2027 first cab off the rank? Want to seed it before launch as test data? - let's aim for rolland Garros but tbh I wouldn't mind testing with italian open, which is on now. 

## Style / conventions

- Australian English in all UI copy.
- Direct, no hedging (matches existing Vault tone).
- Mobile-first — most tipping happens on phones during morning coffee.
- All times displayed in user's local timezone, but stored in UTC.
