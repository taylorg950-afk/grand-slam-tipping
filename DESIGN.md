# Design system

This document is the source of truth for visual design. Every UI change must follow these rules. When in doubt, prefer "less" — less colour, less weight, less border, less padding.

## Philosophy

- **Flat.** No gradients, no drop shadows, no glow, no blur, no noise textures.
- **Calm.** Whitespace does the heavy lifting. Borders are thin (0.5px or 1px max) and low-contrast.
- **Readable first.** A user should be able to scan the page and answer "where do I stand?" in under 2 seconds.
- **Native, not "designed".** Should feel like a clean internal tool, not a SaaS landing page.

## What to avoid

These are the tells of generic AI-generated UI. None of them appear in this project:

- Gradient backgrounds (`bg-gradient-to-r`, etc.)
- Coloured "hero" banners or coloured page headers
- Heavy drop shadows (`shadow-lg`, `shadow-xl`, `shadow-2xl`)
- Large border radii on big elements (`rounded-2xl`, `rounded-3xl` on cards/sections)
- Bold (`font-bold`, `font-weight: 700`) anywhere except the rare emphasis
- Title Case headings ("Your Tournament Dashboard")
- Emojis in UI copy
- Coloured buttons as the default — buttons are outline/ghost unless they're the single primary CTA on a page
- Decorative icons inside coloured circles next to every metric card
- "Glassmorphism" effects (`backdrop-blur`)

## Typography

- **Font:** system sans (Inter or system-ui). One font family across the app.
- **Weights:** 400 (regular) and 500 (medium). Never 600 or 700.
- **Sizes:**
  - Body: 14–16px, line-height 1.5–1.7
  - Small/muted: 12–13px
  - h3: 16px / 500
  - h2: 18px / 500
  - h1 (page titles): 22px / 500
- **Case:** sentence case everywhere. Never Title Case, never ALL CAPS.
- **No mid-sentence bolding** in UI text. Bold is for headings and key data points only (e.g. the big number on a metric card).

## Colour

Three roles only:

1. **Neutral** — the page, cards, borders, body text. Use `slate` or `zinc` as the base ramp.
2. **Accent** — used sparingly, only for "this is you" / "this is the primary action" / "this is a link". Pick one accent (suggested: a muted blue) and stick with it.
3. **Semantic** — success (green), warning (amber), danger (red). Used only where the meaning truly maps. Never decorative.

Rules:

- Backgrounds are white (`bg-white`) or off-white (`bg-slate-50`). Never coloured.
- Coloured fills are pale (50/100 stops). Text on coloured fills uses the 800/900 stop of the same colour, never plain black.
- Borders are `border-slate-200` (light) or `border-slate-300` (slightly stronger for emphasis). Never thicker than 1px.
- Avoid more than 2–3 colours visible on any single screen.

## Layout

- **Page max width:** 1100–1200px, centred with auto margins.
- **Vertical rhythm:** use `1rem` / `1.5rem` / `2rem` for section gaps. Components use `8px / 12px / 16px` internal gaps.
- **Cards:** white background, `border border-slate-200`, `rounded-lg` (8px), padding `p-4` to `p-5`. Never `rounded-xl` or `rounded-2xl`.
- **Metric cards** (the small stat blocks): `bg-slate-50`, no border, `rounded-md`, padding `p-4`. Label above (13px, muted), big number below (24px, weight 500). 4 in a row on desktop.
- **No nested cards.** A card inside a card is almost always wrong.

## Components

### Buttons

- Default style: outline. White or transparent background, 1px border, hover darkens border slightly.
- Primary CTA (one per page max): solid, but in the neutral ramp (slate-900 bg, white text), not the accent.
- No coloured buttons unless the action is destructive (red) or unambiguously "go" (rare).
- No icon-only buttons without an `aria-label`.

### Inputs

- 36–40px height, 1px border, slight rounded corners (`rounded-md`).
- Focus state: ring in the accent colour, no border colour change.
- Labels above inputs, never floating.

### Tables / lists

- Borderless or with `border-b border-slate-100` row separators only.
- No alternating row backgrounds (zebra striping).
- First column: minimal weight. Last column (numbers): right-aligned, `tabular-nums`.
- Hover state: `bg-slate-50`.

### Badges / pills

- Small (12px text), `rounded-md`, `px-2 py-0.5`.
- Pale background (50/100 stop), darker text (800/900 stop) of the same colour family.
- Use sparingly — one or two per row maximum.

### Avatars

- Circular, 28–44px depending on context.
- Coloured background (50 stop) with initials in matching darker text (800 stop).
- Never use the same colour as the page accent.

## "This is you" treatment

In leaderboards and lists where the current user appears, highlight their row with:

- A pale accent background (`bg-blue-50` if accent is blue)
- A 0.5px–1px accent border
- The rank number in accent colour
- Display name in weight 500

Don't add an icon, badge, or "(you)" label *and* the highlight — pick one. The highlight alone is usually enough; "(you)" in muted text after the name is a fine secondary cue.

## Mobile

- Mobile-first. Test every component at 380px viewport.
- Stat cards drop to 2-up on mobile, never single column unless absolutely necessary.
- Tables become cards on mobile (each row becomes a small stacked card).

## When generating new UI

Before writing JSX, answer:

1. What's the primary question this page answers? (e.g. "where do I stand?")
2. What's the single most important number/element? Make it visually loudest (size, not colour).
3. What's the next action? Make it clearly clickable but not loud.
4. Everything else is supporting detail — make it quieter than the above.

If the result has more than 3 visible colours, more than 2 font weights, or any drop shadows, start over.
