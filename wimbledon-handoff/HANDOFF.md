# Wimbledon re-skin — Claude Code handoff

The Tipping Post keeps its **structure, data, and behaviour**. This handoff
changes only the **skin**: palette, type, banner, and voice move from the
terracotta clay edition to **the Championships** — direction **"The Lawn"**.
No layout, query, or state logic changes.

## What's in this folder

| File | Purpose |
|---|---|
| `HANDOFF.md` | This file. The brief + build order. |
| `DESIGN.md` | Updated source of truth — Wimbledon palette, type, components, voice. **Replaces `DESIGN.md` at repo root.** |
| `tokens.css` | CSS custom properties. Merge into `globals.css`. |
| `CHANGES.md` | Exact terracotta → Wimbledon diff. Read this to migrate fast. |

Rendered reference: open **`Wimbledon dashboard.html`** in the design project.
The artboard has a **⋯ → Download PNG** for a 1× reference. The source mockup
is `wimbledon/wb-lawn.jsx` — read it for exact colour, spacing, and type values.

## The direction — "The Lawn"

Light ivory broadsheet, a deep grass-green mown-lawn banner as the signature
colour hit, purple reserved strictly for "you". Display face **Newsreader**,
UI **DM Sans**. Closest to the current build — the migration is a token swap,
not a rebuild.

## What stays exactly the same

- Page structure: masthead → banner → section bar → above-the-fold
  (lead story + standings sidebar) → "below the fold" → order of play + chart.
- All copy templates and state guards from the previous `COPY-PATTERNS.md`
  (still valid — only the *wording register* shifts to British; see DESIGN.md → Voice).
- Newspaper rules, dotted row dividers, "below the fold" marker, sharp corners,
  2px section underlines, no shadows, no gradients (the lawn stripe is the only
  fill texture, and only on the banner).
- The 5-tab bar (Dashboard · Picks · Bracket · Standings · Final).
- Mobile rules from the previous handoff (test at 380px).

## What changes

1. **Palette** — terracotta `brick` → Wimbledon **green + purple**. Warm-brown
   ink → green-black ink. Cream paper retuned slightly cooler. See `CHANGES.md`.
2. **Type** — Instrument Serif → **Newsreader**. DM Sans stays for UI.
   (Instrument Serif is retired.)
3. **Banner** — the terracotta block becomes a **deep-green mown-lawn banner**
   with a 4px green base border. Ghost wordmark behind it is **SW19**.
4. **Accent split** — green carries structure/CTA; **purple is the "you"
   colour** (your row, your pick underline, live/contrarian markers). Max two
   saturated colours visible — same discipline as before.
5. **Voice** — dry-Aussie → **understated British club** (see DESIGN.md).

## Build order

Do these in order. **Stop after each step for review.**

### Step 1 — Tokens + DESIGN.md
1. Replace the old `--tp-*` block in `globals.css` with `tokens.css`.
2. Add the font pairing to the document `<head>`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
   ```
3. Replace `DESIGN.md` at repo root. Confirm `next build` succeeds — no UI
   changes yet beyond the token swap.

### Step 2 — Dashboard
1. Re-skin `src/app/dashboard/page.tsx` to match `wimbledon/wb-lawn.jsx`. Swap
   colour/type tokens; keep the existing data wiring and component structure.
2. Add the green mown-lawn banner with the **SW19** ghost wordmark.
3. Apply the British voice register to the lead headline/standfirst templates.
4. Re-check the empty / no-tournament / no-results states — banner hides
   off-season exactly as before.

### Step 3+ — remaining pages
Picks, Bracket, Standings, Final/Tiebreaker: re-skin with the same token swap.
No structural change. These weren't re-mocked for Wimbledon (we proved the
direction on the dashboard first) — apply the system in DESIGN.md. Ask for
mockups if any page needs a fresh visual call.

## Non-negotiable rules (unchanged)

1. Never render runtime AI-generated prose — templates only.
2. Every component handles empty / partial / error states.
3. No new colours/fonts/weights without updating DESIGN.md first.
4. Sentence case everywhere; only uppercase is small-caps eyebrows.
5. Test every screen at 380px.
6. No emoji, no shadows, no gradients, no rounded corners > 4px on non-avatars.
   More than three saturated colours, more than two font families, or any
   shadow — start over.
