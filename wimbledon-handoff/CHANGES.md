# Terracotta → Wimbledon · migration diff

A direct mapping from the old edition to the Championships. Nothing structural
changes — this is a find-and-replace of design tokens plus the type and voice
shifts noted at the end.

## Colour token map

| Old (terracotta) | Old hex | New (Wimbledon) | New hex | Notes |
|---|---|---|---|---|
| `paper`        | `#FAF6EC` | `--wb-cream`        | `#F6F2E6` | Page bg (Lawn). Slightly cooler. |
| `paper2`       | `#F2EBDC` | `--wb-cream-2`      | `#EFE9D7` | Pulled-out cards. |
| `paper3`       | `#EDE4D0` | `--wb-cream-3`      | `#E7E0CA` | |
| `ink`          | `#1B1814` | `--wb-ink`          | `#15231B` | Warm brown → green-black. |
| `ink2`         | `#3C342C` | `--wb-ink-2`        | `#3B473E` | |
| `ink3`         | `rgba(27,24,20,.55)` | `--wb-ink-3` | `rgba(21,35,27,.55)` | |
| `ink4`         | `rgba(27,24,20,.28)` | `--wb-ink-4` | `rgba(21,35,27,.28)` | |
| `rule`         | `rgba(27,24,20,.18)` | `--wb-rule`  | `rgba(21,35,27,.18)` | |
| `ruleSoft`     | `rgba(27,24,20,.10)` | `--wb-rule-soft` | `rgba(21,35,27,.10)` | |
| `brick`        | `#B85433` | `--wb-court` **+** `--wb-violet` | `#00643C` / `#4F2683` | **Split:** green = structure/CTA, purple = "you". |
| `brickDark`    | `#8E3A1F` | `--wb-court-deep`   | `#0A3D26` | Banner deep variant. |
| `brickSurface` | `#FEF2EC` | `--wb-violet-soft`  | `#EFE9F5` | Pale accent fill (auth screens). |
| `olive`        | `#3D4F2B` | `--wb-court`        | `#00643C` | "Won"/leader green merges into the brand green. |

### The one behaviour change: the accent split

Terracotta used a single `brick` for *everything* accented (CTA, "you", live,
contrarian). Wimbledon **splits** that role:

- **`--accent` (green)** — page structure, primary CTA, active tab, section
  emphasis. The "house" colour.
- **`--accent-you` (purple)** — strictly the user: your standings row, your
  pick underline, the `· you` tag, live/contrarian markers.

This keeps green + purple both present without the screen ever showing more
than two saturated colours at once.

## Chart series map

Old series (`c1…c5`: olive, dusty blue, plum, ochre, sage) →
`--wb-series-1…5`. Assign by the same consistent player order.

## Type

| Role | Old | New |
|---|---|---|
| Display serif | Instrument Serif | **Newsreader** |
| UI sans | DM Sans | DM Sans _(kept)_ |
| Mono | JetBrains Mono | _(kept, still rare)_ |

Google Fonts link:
```html
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
```

All type *sizes, line-heights, and the size table* in DESIGN.md are unchanged —
only the display family swaps (Instrument Serif → Newsreader). Newsreader sits
close to the old metrics, so no size retuning is needed.

## Banner

- **Was:** solid `brick` block, ghost city wordmark (`ROMA`) in white at ~6%.
- **Now:** deep-green block with a **mown-lawn vertical stripe**
  (`--wb-lawn-stripe`), ghost **`SW19`** at ~7%, 4px green bottom border.

## Voice — register shift only

Same template catalogue, same state guards. Re-tone from dry-Australian to
**understated British club**. Examples:

| Terracotta | Wimbledon |
|---|---|
| "Round of 16 *in progress.*" | "Round of 16, *underway* on the lawns." |
| "Hit rate" | "Strike rate" |
| "Streak — 4 in a row" | "On the trot — 4 ties" |
| "contrarian — room favours X" | "against the room — they favour X" |
| "70% of the room agrees" | "70% of the room agrees" _(kept)_ |
| "Locks Wed 6:00pm" | "Play from 1.00pm · locked at first serve" |

Still sentence case. Still no emoji, no exclamation marks. "Tie" for a match,
"the lawns" / "SW19" / "Centre Court" for place, "Fortnight" for the event.
