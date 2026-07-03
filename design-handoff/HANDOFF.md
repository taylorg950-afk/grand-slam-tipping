# The Tipping Post — Claude Code handoff

This folder contains everything Claude Code needs to rebuild the user-facing
pages of the Grand Slam Tipping app in the editorial direction we've chosen
("The Front Page" / Option B).

## What's in this folder

| File | Purpose |
|---|---|
| `HANDOFF.md` | This file. The brief. |
| `DESIGN.md` | **Replaces `DESIGN.md` at the repo root.** Source of truth for type, colour, components, voice, states. |
| `COPY-PATTERNS.md` | Deterministic copy templates. Every state-dependent string on the dashboard. |
| `tokens.css` | CSS custom-property block to merge into `globals.css`. |
| `mockups/` | The JSX mockup files used during design. Read these for exact colour, spacing, and layout values. See `mockups/README.md`. |

## Visual reference

The mockups in `mockups/` show the intended visual for every screen, desktop
and mobile. They're React-in-browser scripts — readable as code, but you can
also open them rendered in a browser by running them from the design project
they were built in.

To get pixel-perfect PNG references for any screen:

1. Open the design project's canvas (the same one this handoff was exported from).
2. Each artboard has a **⋯ menu → Download PNG** option in its header.
3. Saves a 1× PNG at native dimensions.

If you can't access the canvas, the JSX files contain everything Claude Code
needs — exact hex values, type sizes, spacings, and layout structure.

## What's been decided

After exploring three dashboard directions, we've chosen **the broadsheet
treatment** ("The Front Page" / Option B). The whole app uses this language
end-to-end. Key moves:

- **Editorial masthead** — italic Instrument Serif wordmark "The Tipping Post"
  with double rule below, edition strip on the rule.
- **Terracotta clay banner** for the active context, with a huge ghost
  wordmark behind in white at ~6% opacity.
- **Newspaper rules** — 1px hairline ink dividers, 2px solid ink underlines
  below H2 section headings, 3px double rules between major sections,
  "Below the fold" markers, dotted row separators.
- **Sentence case** everywhere. Only uppercase is small-caps eyebrow labels
  (10–11px, 0.18em+ tracking).
- **Dotted paper grain** at 6% opacity over the page background.
- **Brick (`#B85433`) for accent**, olive (`#3D4F2B`) for "you" / "won" data.
  Never more than two saturated colours visible at once.
- **Italic serif headlines** that can break to two lines with the second
  line in italic. This is structural to the voice.
- **No runtime AI-generated prose.** All state-dependent copy comes from
  `COPY-PATTERNS.md` templates.

## Files in the repo this maps to

| Page | Repo file(s) |
|---|---|
| Dashboard | `src/app/dashboard/page.tsx` (rewrite) + `src/app/dashboard/Greeting.tsx` |
| Picks | `src/app/tournaments/[slug]/picks/page.tsx` + `picks/PicksView.tsx` |
| Bracket | `src/app/tournaments/[slug]/bracket/page.tsx` + `bracket/BracketView.tsx` |
| Standings | `src/app/tournaments/[slug]/leaderboard/page.tsx` |
| Final / Tiebreaker | **NEW**: `src/app/tournaments/[slug]/tiebreaker/page.tsx` (per `PROJECT.md`) |
| Tab bar | `src/components/TabBar.tsx` — confirm 5 tabs: Dashboard, Picks, Bracket, Standings, Final |
| Tokens | `src/app/globals.css` — append `tokens.css` |
| Design doc | `DESIGN.md` at repo root — replace with the version in this folder |

## Build order

Do these in order. **Stop after each step and let me review.** Don't barrel
through.

### Step 1 — Tokens + DESIGN.md
1. Append the contents of `tokens.css` into `src/app/globals.css` (keep
   the existing Tailwind/Shadcn imports at the top).
2. Replace `DESIGN.md` at the repo root with the version in this folder.
3. Confirm `next build` still succeeds. No UI changes yet.

### Step 2 — Dashboard
1. Rewrite `src/app/dashboard/page.tsx` to match `mockups/tp-option-b.jsx`.
2. Use `COPY-PATTERNS.md → Dashboard headline` and `Dashboard body copy`
   to derive the lead headline + body. Build a typed helper module —
   suggested: `src/lib/copy/dashboard-headline.ts` + `dashboard-body.ts`.
3. Mobile (`mockups/tp-option-b-mobile.jsx`) — keep wordmark centred, drop
   to single column, retain "Below the fold" divider, "By the numbers"
   stays 2×2.

### Step 3 — Standings
1. Update `src/app/tournaments/[slug]/leaderboard/page.tsx` to match
   `mockups/tp-page-standings.jsx` (and `mockups/tp-mobile-pages.jsx → TPMobileStandings`).
2. The per-round columns use **heat shading** — fill opacity scales by the
   value relative to that round's max. Formula: `rgba(184,84,51, 0.08 + (v/max) * 0.22)`.
3. "Movers since R32" — see `COPY-PATTERNS.md → Standings movers`.

### Step 4 — Picks
1. Update `picks/PicksView.tsx` to match `mockups/tp-page-picks.jsx`
   (and `mockups/tp-mobile-pages.jsx → TPMobilePicks`).
2. Round nav tape across the top, each round card showing `+points`
   (done) / `Live` (active) / `to come` (pending).
3. Match cards tint olive border for correct, brick border for wrong,
   neutral for pending/picked/open.

### Step 5 — Final / Tiebreaker (NEW page)
1. Create `src/app/tournaments/[slug]/tiebreaker/page.tsx` per
   `PROJECT.md`'s tiebreaker schema.
2. Match `mockups/tp-page-final.jsx` and `mockups/tp-mobile-pages.jsx → TPMobileFinal`.
3. Two number scrubbers (men's, women's), with the rules pull-out and
   historical strip. Historical data: either hard-code a static table
   per tournament (acceptable for v1) or skip the strip if you don't want
   to seed it.

### Step 6 — Bracket
1. Rewrite `BracketView.tsx` to match `mockups/tp-page-bracket.jsx`.
2. Full draw R64 → F. Top half stacked above bottom half, Final centred
   between them on a ruled divider.
3. Mobile (`mockups/tp-mobile-pages.jsx → TPMobileBracket`): **swap to a round navigator,
   no bracket visual.** Use a media-query guard (mobile-first breakpoint
   at 768px or per existing repo convention).

## Non-negotiable rules

These are in `DESIGN.md` too but worth surfacing here:

1. **Never render runtime AI-generated prose.** Every sentence on the page
   is either:
   (a) a static string in the codebase,
   (b) a template from `COPY-PATTERNS.md` with named slots filled from
       query results, or
   (c) a static fallback used when any required slot is null.
2. **Every component handles empty / partial / error states.** See
   "States & failure modes" in DESIGN.md.
3. **No new colours, fonts, or weights** without updating DESIGN.md first.
4. **Sentence case everywhere.** Only uppercase is small-caps eyebrow labels.
5. **Test every screen at 380px.**
6. **No emoji. No drop shadows. No gradients. No rounded corners > 4px on
   non-avatar elements.** If the result has more than three saturated
   colours, more than two font weights, or any shadows — start over.

## What's intentionally not in this package

These are deferred until you've shipped the pages above:

- **Round detail page** (when you click a round name from Standings). It's
  the same component family as Picks; design later.
- **Admin pages.** No design treatment yet — they can stay quiet/utility
  styled until the user-facing pages are settled.
- **Auth screens** (`/login`, `/signup`) — they already use the brick
  surface tokens; minor touchup later.
- **Standings "Movers" narrative templates** beyond the three shipped. Add
  more as patterns emerge.

## How to use with Claude Code

Open Claude Code in the repo, then say something like:

> Read `handoff/HANDOFF.md`, `handoff/DESIGN.md`, `handoff/COPY-PATTERNS.md`,
> and `handoff/mockups/README.md`. The mockups in `handoff/mockups/` show
> the intended visual for every screen — read the JSX for exact values.
> Then start at Step 1 of the build order in HANDOFF.md and stop after
> each step so I can review.

Or if you're confident:

> Read `handoff/HANDOFF.md` and follow the build order. Pause for review
> after the dashboard step.

## Open questions for you to decide

These need a call before / during implementation. Defaults in parentheses.

- **Tournament-aware accent.** Right now everything is terracotta. Decide
  whether to swap accents per Slam: AO (blue), RG (clay/terracotta),
  Wimby (green), USO (navy + yellow). _(Default: keep terracotta always.)_
- **Mobile bracket as round-navigator only**, or add a pinch-zoom full
  bracket as a secondary view? _(Default: round-navigator only.)_
- **Tiebreaker history strip** — seed static data per tournament, or skip
  in v1? _(Default: seed Rome only; skip for other tournaments until you
  have data.)_
- **Order of play on dashboard** — currently shows 6 matches with consensus
  %. The consensus % requires querying everyone's locked picks, which is
  fine after lock but expensive pre-lock. Decide whether to show consensus
  only on locked-or-resulted matches. _(Default: yes, hide pre-lock.)_
