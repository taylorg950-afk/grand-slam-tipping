# Design system — The Tipping Post · Wimbledon edition

> Source of truth for visual design. Replaces the terracotta edition doc. The
> app's structure, voice discipline, and "considered, calm, at-a-glance"
> philosophy are unchanged — this edition re-skins it for the Championships in
> the **"The Lawn"** direction.

## Philosophy

A small private tipping comp dressed as a personal sports broadsheet — now
wearing the green and purple of the Championships. Warm but composed; a club
programme, not a tabloid. Three feelings the UI should give:

- **Considered.** Reads like something printed. Whitespace, rules, and type
  hierarchy do the work — not colour, gradients, or icons.
- **Calm but with personality.** Sentence case, italic emphasis, the occasional
  pull quote. Understated British club voice.
- **At a glance.** Answer "where do I stand?" in under two seconds, before
  reading any prose.

## Colour

Classic Wimbledon green + purple on ivory. Saturation lives in two accents
only. Green ≈ Pantone 342, Purple ≈ Pantone 2685. Build against the **semantic
tokens** (`--page`, `--text`, `--accent`, …) defined in `tokens.css`, not the
raw hexes.

| Token              | Hex       | Use |
|--------------------|-----------|-----|
| `--wb-court`       | `#00643C` | Primary grass green — structure, CTA, active tab |
| `--wb-court-deep`  | `#0A3D26` | Deep green — banner fill |
| `--wb-court-line`  | `#1C7A4E` | Mown-stripe highlight |
| `--wb-violet`      | `#4F2683` | **Wimbledon purple — the "you" colour** |
| `--wb-violet-soft` | `#EFE9F5` | Pale accent fill (auth screens, rare) |
| `--wb-cream`       | `#F6F2E6` | Page background |
| `--wb-cream-2/3`   | `#EFE9D7` / `#E7E0CA` | Pulled-out cards |
| `--wb-ivory`       | `#FBF8EF` | Brightest surface / banner text |
| `--wb-ink`         | `#15231B` | Green-black text, headlines, rules |
| `--wb-ink-2/3/4`   | —         | Secondary / tertiary / quaternary text |
| `--wb-rule`/`-soft`| —         | Hairline / background-grid dividers |

### The accent split (important)

Unlike the terracotta edition's single accent, **green and purple have
distinct jobs**:

- **`--accent` (green)** — the house colour: page structure, the single
  primary CTA per page, the active tab, section emphasis.
- **`--accent-you` (purple)** — *strictly the user*: your standings row, your
  pick underline, the `· you` tag, live and "against the room" markers.

Never more than two saturated colours visible at once. Avatars never use the
"you" accent (it's reserved for you).

### Rules

- Backgrounds: cream or cream-2. Never solid white, never a colour. The only
  coloured *fill* is the banner.
- Chart palette: `--wb-series-1…5`, assigned by consistent player order. Don't
  introduce new chart colours.

## Texture

Two textures, both subtle:

1. **Paper grain** — radial-dot, `--wb-grain`, at `--grain-opacity` (0.05). A
   fixed `aria-hidden` layer over the page bg. Never on content surfaces.
2. **Mown-lawn stripe** — `--wb-lawn-stripe`, alternating tonal green bands.
   **Banner only.** This is the signature Wimbledon move; do not spread it onto
   cards or the page.

## Type

- **Display serif:** Newsreader. Wordmark, headlines, numbers, rank numerals,
  pull quotes, italic emphasis. Weights 400/500; italic is part of the voice.
- **UI sans:** DM Sans (400/500, 700 for eyebrows/active tab). Body, labels,
  small-caps eyebrows, table data.
- **Mono:** rare — fixed-width data only (timestamps, IDs).

Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
```

### Sizes (web) — unchanged from the previous edition

| Role | Family | Size / line / weight | Notes |
|---|---|---|---|
| Wordmark | Serif it. | 26–78 / 1 / 400 | Centred broadsheet; left on compact |
| H1 headline | Serif | 32–52 / 1.05 / 400 | 2nd line may be italic |
| H2 section heading | Serif | 22 / 1 / 400 | Followed by a 2px solid ink rule |
| Banner H1 | Serif | 38–40 / 1.1 / 400 | Status verb in italic |
| Hero numbers | Serif | 24–64 / 0.95 | `tabular-nums` |
| Rank numerals | Serif it. | 22 / 1 | Italic — typographic, not data |
| Body | Sans | 14 / 1.6 / 400 | |
| Eyebrow / label | Sans | 9–11 / 1 / 600 | 0.18–0.22em tracking, **uppercase** — the only uppercase |
| Caption / muted | Sans | 11–13 / 1.2–1.4 / 400 | text-2 / text-3 |

Weights: **400/500**, plus 600/700 for small eyebrows and the active tab where
DM Sans needs the weight to register. No 700 in running copy or headlines.

### Case rules
Sentence case everywhere. Only uppercase: small-caps eyebrows (0.18em+
tracking). Never Title Case. Never SHOUTING.

## Components

(Structure unchanged from the terracotta edition — only colour/type tokens
swap. Summarised here; see `wb-lawn.jsx` for exact spacing.)

- **Masthead** — italic-serif "The Tipping Post" wordmark, edition strip
  (`Vol. I · No. 07 · Monday · Day 7`), sub-line `The Championships,
  Wimbledon · Fortnight edition`.
- **Banner** — the day's context: a deep-green **mown-lawn block** with a 4px
  green base border, carrying the **SW19** ghost wordmark (ivory ~7%), eyebrow
  `Wimbledon · Day n`, an italic status verb, and a picks-in / play-time / lock
  status line. The only coloured fill on the page. Hidden off-season.
- **Eyebrow label** — 9–11px / 0.18em+ uppercase. `--text-2` default, `--accent`
  or `--accent-you` for live/lead items.
- **Section heading** — H2 serif + 2px solid `--text` underline. Optional
  right-hand eyebrow. No icons.
- **Standings row** — `[rank·italic serif] [avatar] [name] [points·serif]`.
  Your row uses `--accent-you` text + weight 500 + `· you` in italic. Dotted
  1px separators, never striped backgrounds.
- **Pick / match row** — `[time·italic serif] [matchup serif] [open/locked]`.
  Picked player gets a 1.5px `--accent-you` underline, 4px offset. Contrarian:
  "against the room — they favour X" in `--accent-you`.
- **By the numbers** — 2×2 grid in a cream-2 card with 1px rule border.
- **Pull quote / drop cap** — serif italic; drop cap in `--accent` (green).
- **Buttons** — one primary CTA per page in `--accent` (green) fill, ivory
  text, square corners. Everything else ghost (green text, hover to ink).
- **Tab bar** — 6 tabs (Dashboard · Picks · Bracket · Standings · Final ·
  Rules). Active = `--accent` (green) + 1px underline.

## Voice — understated British club

Same template catalogue and state guards as before; re-toned. Dry and
observational, but refined — a club programme, not a commentator.

- ✅ "Round of 16, *underway* on the lawns."
- ✅ "Taylor holds a 22-point lead as the lawns reach the *last sixteen.*"
- ✅ "Play from 1.00pm. All courts locked at first serve."
- ❌ "🎾 Live Now!"  ❌ "Welcome back, champion 🏆"  ❌ exclamation marks

Vocabulary: a match is a **tie**; place is **the lawns / SW19 / Centre Court**;
the event is **the Fortnight**; "strike rate" not "hit rate"; "on the trot"
not "streak". No emoji.

### No runtime AI prose
Every sentence is a static string, a template with guarded slots (authored
offline), or a static fallback when a slot is null. New states need a new
template, not freeform generation.

## States & failure modes

Unchanged from the terracotta edition — re-verify after the re-skin:

| State | Behaviour |
|---|---|
| No active tournament | Hide banner / order of play / chart. Lead → "Between the Slams". |
| Started, no resulted matches | Hide chart. Standings show "—". By the numbers zeros, strike rate "—". |
| User has no tips filed | Lead uses "Welcome" template. Banner picks-in = 0. |
| < 3 tippers | Drop "lead over 2nd". Skip "+N more". |
| Tied for 1st | Headline "tied with {others} on {points}". |
| Round partially open | Order of play shows scheduled ties only, "+N to be scheduled". |
| Any required slot null | Drop the template; use the one-line fallback. Never render `{undefined}`. |

## When generating new UI
1. Which state(s)? Design empty/partial/error first.
2. What's the primary question? Make the answer the loudest typographic element.
3. Is every sentence static or a guarded template?
4. Anything new (colour/weight/radius/shadow/icon)? Justify here first.

## What we don't do
Gradient backgrounds, glassmorphism, shadows, glow. Bold (700) except small
eyebrows/active tab. Title Case. Rounded corners > 4px on non-avatars. Emoji.
Decorative icons in coloured circles. Coloured buttons as default. Pulsing
"live" pills. Runtime AI prose. More than two saturated colours, more than two
font families, or any shadow on one screen → start over.
