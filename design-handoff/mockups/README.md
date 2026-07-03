# Mockup source — read me

The `.jsx` files in this folder are the working mockups built during design.
**They are not source code to ship.** They're a visual + structural
specification — read them to confirm exact colour, spacing, type sizes,
layout structure, and component anatomy. Translate to the project's stack
(Next.js + Tailwind 4 + shadcn).

## File map

| Mockup file | Maps to repo file |
|---|---|
| `tp-shared.jsx` | The token + primitive layer. The `TP.*` colour map and the `TPMasthead` / `TPSectionHead` / `TPEyebrow` / `TPAvatar` / `TPSparkline` / `TPMove` / `TPLineChart` / `TPTabBar` primitives. **These should become real shared components in `src/components/`** (e.g. `Masthead`, `SectionHead`, `Eyebrow`, etc.). |
| `tp-option-b.jsx` | Dashboard desktop → `src/app/dashboard/page.tsx` |
| `tp-option-b-mobile.jsx` | Dashboard mobile (same file, responsive) |
| `tp-page-picks.jsx` | Picks desktop → `src/app/tournaments/[slug]/picks/PicksView.tsx` |
| `tp-page-bracket.jsx` | Bracket desktop → `src/app/tournaments/[slug]/bracket/BracketView.tsx` |
| `tp-page-standings.jsx` | Standings desktop → `src/app/tournaments/[slug]/leaderboard/page.tsx` |
| `tp-page-final.jsx` | Final desktop → NEW `src/app/tournaments/[slug]/tiebreaker/page.tsx` |
| `tp-mobile-pages.jsx` | Mobile versions of Picks / Bracket / Standings / Final |

## How to read them

- They're **React + Babel browser scripts**, not Next.js components. No
  imports, no module system; they attach to `window` at the bottom of each
  file.
- All styling is **inline `style={{ ... }}`** with values from `TP.*` (see
  `tp-shared.jsx`). When translating, use the CSS variables from
  `handoff/tokens.css` instead of literal hex codes.
- Mock data is hard-coded inside each component (e.g. the 32 R64 matches in
  `tp-page-bracket.jsx`). **Replace with real queries** when implementing.
- The `TPLineChart` and `TPSparkline` SVG renderers are intentionally
  hand-rolled to demonstrate the visual; in the repo, use the existing
  `recharts` integration (already a dependency) styled to match.

## Don't copy the mock data structures verbatim

The mock `TP_DATA` object in `tp-shared.jsx` flattens what would be three
Supabase queries (`users`, `tips`, `matches`) into one shape for design
purposes. The repo already has the correct query structure (see
`src/app/dashboard/page.tsx` for the canonical shape).

## Reference, not source

The mockups are visual reference. If something in the mockup contradicts
`DESIGN.md` or `COPY-PATTERNS.md`, the markdown wins — the mockups are
a snapshot of the design at a moment in time; the markdown is the
maintained spec.
