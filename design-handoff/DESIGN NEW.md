# Design system — The Tipping Post

> This document is the source of truth for visual design. Every UI change must
> follow it. Replaces the earlier "quiet flat internal-tool" doc — the app has
> moved to an editorial direction.

## Philosophy

A small private tipping comp dressed as a personal sports broadsheet. The
"Tipping Post" is your morning paper for the tournament: warm cream stock,
italic serif wordmark, terracotta clay accent, dry editorial voice.

Three feelings the UI should give:

- **Considered.** Reads like something printed, not generated. Whitespace, rules,
  and type hierarchy do the work — not colour, gradients, or icons.
- **Calm but with personality.** Sentence case, italic emphasis, the occasional
  pull quote. Punchy without being chirpy. Aussie English throughout.
- **At a glance.** A user should answer "where do I stand?" in under two
  seconds, before reading any prose.

## Type

- **Serif (display):** Instrument Serif. Used for the wordmark, headlines,
  numbers, rank indicators, pull quotes, italicised emphasis. Weight 400 only;
  italic is part of the voice (never use italic to mean "italic UI" — it's
  always part of the editorial cadence).
- **Sans (body / UI):** DM Sans, weights 400 / 500. Body copy, labels,
  small-caps eyebrows, table data.
- **Mono:** rare — only when typesetting fixed-width data (timestamps,
  internal IDs). Not used for headings.

### Sizes (web)

| Role                 | Family    | Size / line / weight   | Notes |
|----------------------|-----------|------------------------|-------|
| Wordmark             | Serif it. | 26–84 / 1 / 400        | Centred broadsheet on large; baseline left on compact |
| H1 headline          | Serif     | 32–56 / 1.04 / 400     | Headlines may break across 2 lines, second line italic |
| H2 section heading   | Serif     | 19–22 / 1 / 400        | Always followed by a 2px solid ink rule beneath |
| Banner H1            | Serif     | 30–56 / 1.05 / 400     | Status verb in italic |
| Hero numbers         | Serif     | 24–64 / 0.95 / 400     | `font-variant-numeric: tabular-nums` |
| Rank numerals        | Serif it. | 19–22 / 1 / 400        | Italic — these are typographic, not data |
| Body                 | Sans      | 14 / 1.55 / 400        | Justify only in newspaper-style column blocks |
| Standfirst / quote   | Serif it. | 14–19 / 1.3–1.4 / 400  | Italic |
| Eyebrow / label      | Sans      | 9–11 / 1 / 500–600     | 0.18em–0.22em tracking, **uppercase** — the only uppercase allowed |
| Caption / muted      | Sans      | 11–13 / 1.2–1.4 / 400  | Lower contrast (ink2 / ink3) |

### Case rules

- Sentence case for all running copy, headlines, buttons, links.
- The **only** uppercase: eyebrows (small-caps labels). Always with letter
  spacing 0.18em+.
- Never Title Case. Never SHOUTING.

## Colour

Warm-paper palette. Saturation only in two accents.

| Token         | Hex        | Use |
|---------------|------------|-----|
| `paper`       | `#FAF6EC`  | Page background |
| `paper2`      | `#F2EBDC`  | Pulled-out cards, "By the numbers", lead-match blocks |
| `paper3`      | `#EDE4D0`  | Slightly stronger surface (rare) |
| `ink`         | `#1B1814`  | Primary text, headlines, rules |
| `ink2`        | `#3C342C`  | Secondary text, eyebrows, muted body |
| `ink3`        | rgba(27,24,20,0.55) | Tertiary, captions |
| `ink4`        | rgba(27,24,20,0.28) | Quaternary, disabled |
| `rule`        | rgba(27,24,20,0.18) | Hairline dividers |
| `ruleSoft`    | rgba(27,24,20,0.10) | Background gridlines, dotted dividers |
| `brick`       | `#B85433`  | **Accent.** "This is you", primary CTA, live indicators, lead/brick highlights |
| `brickDark`   | `#8E3A1F`  | Brick hover, banner deep variant |
| `brickSurface`| `#FEF2EC`  | Pale accent fill (rare — used on the auth screens, not the dashboard) |
| `olive`       | `#3D4F2B`  | Success / leader / "your" data series. Replaces a green check |

### Rules

- Backgrounds: paper or paper2. Never solid white. Never a colour.
- Coloured surfaces: only the banner uses brick as a fill (display: hero).
- Avoid more than two saturated colours visible at once. Brick + olive max.
- The chart palette mixes brick / olive / dusty blue / plum / ochre / sage.
  Don't introduce new chart colours — pick from the shared series and assign by
  consistent player order.

## Texture

A radial-dot paper grain over the page background:

```
backgroundImage: radial-gradient(circle at 1px 1px, rgba(27,24,20,0.45) 0.5px, transparent 0);
backgroundSize: 3px 3px;
opacity: 0.06;
```

Sits over the page bg via an `aria-hidden` fixed layer. Never applied to
content surfaces.

## Layout & rules

- **Page rhythm:** 32px horizontal padding on desktop, 16px on mobile.
- **Vertical:** sections separated by either a 1px ink-rule, a 2px-solid
  underline below a heading, a 3px-double rule (newspaper section break), or
  a `· Below the fold ·` divider with the 3px double rule.
- **Dotted dividers** (1px dotted rule colour) for table rows / list items.
  Never alternating row backgrounds.
- **Corners:** sharp. Square. The occasional 2px or 1px subtle radius is fine
  for inputs only. No `rounded-lg`, no `rounded-xl`, no `rounded-full` except
  on avatars and status dots.
- **Cards:** paper2 background, 1px ink-rule border, no shadow, no radius.
- **Column rules:** 1px hairline verticals between major content columns
  (newspaper convention).

## Components

### Masthead

The wordmark is "The Tipping Post" set in Instrument Serif italic. Two scales:

- **Broadsheet** (front-page treatment): centred, 70–84px, double-rule above
  and below, edition strip (`Vol I · No. 14 · Tue · Day 14`) on the rule.
- **Compact** (sub-pages): left-aligned, 22–26px, single hairline below,
  edition info and nav as eyebrow on the right.

### Status banner

The terracotta clay block at the top of the active dashboard. Includes:

- Eyebrow: `{tournament name} · Day {n}`
- Headline: `{round long name} {status verb in italic}.` (e.g. "Round of 16
  *in progress*.")
- Status line: picks-in count, picks-to-call count, lock countdown.
- A huge ghost wordmark (the tournament city) behind, set in serif italic,
  white at 6–8% opacity. Cropped by the banner — never fully visible.

The banner is the only solid-colour surface on the page. Off-season: no banner.

### Eyebrow label

The small-caps marker used everywhere (`FROM THE EDITOR`, `LEAD`, `BY THE
NUMBERS`, etc.):

```
font: 500–600 9–11px DM Sans
letter-spacing: 0.18em
text-transform: uppercase
color: ink2 (default) or brick (for "lead" / live items)
```

### Section heading

H2 in serif, followed by a 2px solid ink rule beneath. Optional right-hand
eyebrow ("See all", "Live · since R32"). No icons.

### Standings row

The most-repeated component. Grid: `[rank] [avatar] [name] [points] [hits] [%]`.

- Rank in **italic serif** — typographic, not data.
- Avatar: 22–26px circle, coloured background per player, initials in ink or
  paper depending on contrast. Never the brick colour (reserved for "you").
- Your row: brick text, weight 500, with `· you` in italic ink2 after the
  name. No icon, no separate badge.
- Numbers right-aligned, tabular-nums, points in serif at one size up.
- Row separators: 1px dotted rule.

### Pick / match row

Layout: `[time] [matchup serif] [open/locked eyebrow]`. The picked player gets
a 1.5px brick underline, 4px offset. Contrarian state (your pick differs from
the room) flagged with a small brick caption: "contrarian · room favours X".

### Pull quote

Left brick rule (3px), 16px left padding, italic serif at 17–19px, ink2. The
sentence ends with a not-italic span in weight 500 — the "punchline". The
quote is the closing voice of the page, not a stat.

### Buttons

- **Primary CTA** (one per page): brick fill, paper text, 10px uppercase
  eyebrow type, 0.2em tracking, square corners.
- **Secondary**: ghost — no fill, no border, just brick text with hover to
  ink.
- No icon-only buttons without `aria-label`.

### Drop cap

The body's first paragraph in a lead story or column block can use a serif
italic drop cap: ~48–56px, float left, line-height ~0.85, 6–8px right/bottom
padding. Falls back gracefully if the first character is a number or symbol —
in which case drop the cap, don't render junk.

## Voice

Dry, observational, slightly Aussie. Sports columnist not Premier League
commentator. Sentence case. Italic for emphasis (typographically — not
*"important"* on every other word).

- ✅ "Round of 16 *in progress.*"
- ✅ "Evening, Tay. You're top of the pile. Hold the line."
- ✅ "Locks in 2h 14m. Three more after this — Świątek, Zverev, Rybakina."
- ❌ "🎾 Live Now! Don't miss out!!"
- ❌ "Welcome back, champion 🏆"

No emoji. No exclamation marks. No "Hey there 👋". No "Let's do this!"

## Editorial copy patterns

**The dashboard must never render runtime AI-generated prose.** Every sentence
on the page is one of:

1. A static string in the codebase.
2. A template with named slots filled from query results, where the template
   was authored offline.
3. A static fallback used when any required slot is null.

See the **B · headline + body patterns** artboard for the catalogue of
templates and the state guards that trigger each one. New states require a new
template, not freeform generation.

## States & failure modes

The dashboard has many states. The current build's biggest risk is rendering
sensibly across all of them. Required behaviour:

| State                                | Behaviour |
|--------------------------------------|-----------|
| No active tournament                 | Hide banner, "Pick of the day", "Today's order", chart. Lead becomes "Between Slams". |
| Tournament started, no resulted matches | Hide chart. Standings show "—" for points + accuracy. By the numbers shows zeros, hit rate as "—". |
| User has no tips filed               | Lead uses "Welcome" template. Banner picks-in = 0. By the numbers user row in muted state. |
| < 3 tippers                          | Drop "Lead over 2nd" stat. Skip "+N more" footer. |
| Tied for 1st                         | Headline: "tied with {others} on {points}". |
| Round partially open                 | Today's order shows scheduled matches only, with "+N to be scheduled" footer. |
| Any required slot null               | Drop the whole template. Use the one-line fallback for that block. Never render a sentence with `{undefined}` in it. |

## Mobile

The dashboard is mobile-first by usage. Test every component at 380px.

- The broadsheet wordmark scales to 40–46px italic centred.
- Multi-column body copy collapses to single column. Drop cap stays.
- Sidebar standings drops to full-width below the lead story.
- "By the numbers" stays a 2×2 grid (never single column).
- "Below the fold" double-rule + tiny centred label survives mobile and is
  the only marker that the layout is broadsheet-derived.
- Order of play: render 4 matches max, then "+N more · see Picks →".
- Chart: full width below order of play.
- Tab bar pinned to the bottom of the viewport, 5 tabs (Dashboard, Picks,
  Bracket, Standings, Final), eyebrow type, active = brick + 1px brick
  underline.

## When generating new UI

Before writing JSX, answer:

1. What state(s) is this for? Does it have a defined empty / partial / error
   variant? If no — design those first.
2. What's the primary question this page answers? Make the answer the
   loudest typographic element.
3. Is every sentence on the page either a static string or a template with
   guarded slots? If a sentence depends on a free-text AI call, restructure.
4. Is anything new? New colour, new font weight, new corner radius, new
   shadow, new icon? If yes — justify it here, don't just merge.

## What we don't do

These are the failure modes of generic SaaS dashboards. None of them appear in
the Tipping Post:

- Gradient backgrounds, glassmorphism, drop shadows, glow effects.
- Bold (700) anywhere except the rare emphasis. Weights 400/500 only.
- Title Case headings. ALL CAPS body. Sentence case everywhere except
  small-caps eyebrows.
- Rounded corners larger than 4px on anything that isn't an avatar.
- Emoji in UI copy.
- Decorative icons inside coloured circles next to every stat.
- Coloured buttons as the default. Buttons are ghost unless they're the page's
  single primary CTA, which is brick.
- "Live" pills with pulsing dots. Use the eyebrow `· Live` in brick instead.
- Auto-generated AI prose at runtime. Templates only.
- Coloured page headers that aren't the terracotta banner.
- More than three saturated colours visible on one screen.

If the result has more than three visible saturated colours, more than two
font families, more than two font weights, or any drop shadows — start over.
