# Copy patterns — The Tipping Post

Deterministic templates for every user-visible string that depends on game
state. Used by the dashboard headline, dashboard body copy, standings
movers panel, and pull quote. **Never generate runtime AI-generated prose
on these surfaces** — pick the template that matches the state, fill the
slots, ship.

## Implementation pattern

A copy module per surface — typed input, switch on state, return a static
shape. Example for the dashboard headline:

```ts
// src/lib/copy/dashboard-headline.ts

export interface HeadlineState {
  hasActiveTournament: boolean;
  isFirstTimeUser: boolean;
  rank: number | null;
  numTippers: number;
  gap: number;            // points to next-best (or 0)
  leaderName: string;
  yourName: string;
  city: string;           // e.g. "Rome"
  round: string;          // e.g. "Round of 16"
  roundResultedCount: number;
  tournamentComplete: boolean;
  finalPoints?: number;
  nextTournament?: string;
  nextTournamentDate?: string;
  numUnpickedMatches?: number;
  locksIn?: string;       // e.g. "2h 14m"
}

export interface Headline {
  kicker: string;
  line1: string;
  line2: string;          // italic in the render
}

export function dashboardHeadline(s: HeadlineState): Headline {
  if (!s.hasActiveTournament) return {
    kicker: 'Between Slams',
    line1: 'Between Slams.',
    line2: `${s.nextTournament} opens ${s.nextTournamentDate}.`,
  };

  if (s.tournamentComplete) return {
    kicker: 'Tournament complete',
    line1: `${s.leaderName} takes ${s.city}`,
    line2: `on ${s.finalPoints}.`,
  };

  if (s.isFirstTimeUser && s.numUnpickedMatches) return {
    kicker: 'Welcome',
    line1: 'Welcome to the comp.',
    line2: `${s.numUnpickedMatches} matches need your call.`,
  };

  if (s.roundResultedCount === 0) return {
    kicker: 'Round opens',
    line1: `${s.round} opens.`,
    line2: `First lock in ${s.locksIn}.`,
  };

  if (s.rank === 1 && s.gap >= 10) return {
    kicker: 'Leading',
    line1: `${s.yourName} holds ${s.gap}-point lead`,
    line2: `as ${s.city} hits the ${s.round}.`,
  };

  if (s.rank === 1 && s.gap < 10) return {
    kicker: 'Leading narrowly',
    line1: `${s.yourName} clings to a ${s.gap}-point lead`,
    line2: `as ${s.round} closes in.`,
  };

  if (s.rank! >= 2 && s.rank! <= 4) return {
    kicker: 'In the pack',
    line1: `${s.leaderName} leads by ${s.gap};`,
    line2: `you sit ${ordinal(s.rank!)}.`,
  };

  return {
    kicker: 'Down the back',
    line1: `${s.leaderName} runs away with ${s.city}`,
    line2: `as ${s.round} approaches.`,
  };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
```

The same shape applies to body copy, movers, pull quote. Inputs typed,
output a deterministic structure, no fallthrough to AI.

---

## Dashboard headline

The italic-second-line is structural — line2 is rendered italic. Both lines
are Instrument Serif.

| Kicker | When | Line 1 | Line 2 (italic) |
|---|---|---|---|
| Between Slams | `!hasActiveTournament` | `Between Slams.` | `{nextTournament} opens {nextTournamentDate}.` |
| Tournament complete | `tournamentComplete` | `{leader} takes {city}` | `on {finalPoints}.` |
| Welcome | `isFirstTimeUser && numUnpickedMatches > 0` | `Welcome to the comp.` | `{n} matches need your call.` |
| Round opens | `roundResultedCount === 0` | `{round} opens.` | `First lock in {locksIn}.` |
| Leading | `rank === 1 && gap >= 10` | `{yourName} holds {gap}-point lead` | `as {city} hits the {round}.` |
| Leading narrowly | `rank === 1 && gap < 10` | `{yourName} clings to a {gap}-point lead` | `as {round} closes in.` |
| In the pack | `2 <= rank <= 4` | `{leader} leads by {gap};` | `you sit {ordinal}.` |
| Down the back | `rank >= 5` | `{leader} runs away with {city}` | `as {round} approaches.` |

### Tied for first

If `rank === 1` but `gap === 0` (tied with one or more), use:
```
{yourName} tied at the top
with {otherName(s)} on {points}.
```

For more than 2 tied, render: `with {firstOther} and {n} others on {points}.`

---

## Dashboard body copy

Sans-serif body, two inner columns on desktop with a column rule, single
column on mobile. First paragraph gets a serif italic drop cap on its
first letter — drop the cap if the first character isn't a letter.

### Template A — "The Leader"

**When:** `rank === 1 && roundResultedCount > 0`

```
{city}'s {surface} has been kind to the leader. With {r1Correct} of
{r1Total} {firstRoundName} picks landing then {r2Correct} of {r2Total}
in {secondRoundName}, {yourName} now sits on {points} points — a
{accuracy}% hit rate across {tipped} tips.

The challenger, {secondName}, has been quieter on volume but sharper,
converting {secondAccuracy}% of {secondTipped} tips. With {nextRound}
worth {nextRoundPts} points each, the gap could close in an afternoon.

The room is in agreement on the day's lead match. {consensus} draws
{consensusPct}% support; only {nonConsensusCount} tipper(s) called the
upset. Locks at {leadMatchLockTime}.

Continued in Order of play →
```

### Template B — "The Chaser"

**When:** `2 <= rank <= 4 && roundResultedCount > 0`

```
{leader} sits on {leaderPts} after a {leaderAccuracy}% run through the
early rounds. You're {gap} back on {points} — well inside one strong
round.

{nextRound} is worth {nextRoundPts} per pick. {leader} would need to
keep landing them; a sharper {nextRound} from you puts the title back
in play.
```

### Template C — "Round opens"

**When:** `roundResultedCount === 0 && currentRoundMatchCount > 0`

```
{round} fixtures are up. {nMatches} matches to call, with the first lock
at {firstLock}.

Highest-profile call: {leadMatchP1} v {leadMatchP2}. The room's leaning
{consensusPct}% toward {consensus}. Your move.
```

### Template D — "Welcome"

**When:** `isFirstTimeUser && hasActiveTournament`

```
Quiet so far. {nUnpicked} matches sit unpicked across {round}, with the
first lock at {firstLock}. Open Picks to file them; you can edit until
the moment each match starts.
```

### Template E — "Down the back"

**When:** `rank >= 5 && numTippers >= 8`

```
The field has stretched out. {leader} sits on {leaderPts}, {gapLeader}
ahead of you; {nAbove} tippers in between. With {nRoundsLeft} rounds
to play and the bigger points still on the table, this isn't done — but
it'd take a near-perfect run from here.
```

### Fallback (any template's slot null)

If any required slot is null/undefined, **drop the whole template** and
render this single line:

```
{round} is underway. Open Picks to file them.
```

---

## Pull quote (closing line on dashboard)

Renders bottom-of-page, left brick rule, italic serif body with the
second clause not-italic and weight 500.

| When | Italic | Bold |
|---|---|---|
| `picksIn === 0 && currentRoundIsOpen` | `Round opens.` | `Nothing in yet — get on it.` |
| `picksIn === totalPicks` | `All in.` | `Now we wait.` |
| `picksIn > 0 && picksIn < totalPicks` | `{n} still to call.` | `Don't dawdle.` |
| `!hasActiveTournament` | `Quiet on the wire.` | `Next match in {n} days.` |
| `tournamentComplete && !nextSoon` | `Tournament's done.` | `Stretch the legs.` |
| `tournamentComplete && nextSoon` | `Tournament's done.` | `{nextTournament} starts {date}.` |

---

## Banner status verb

The terracotta banner sets context. Italic verb after the round name.

| When | Verb |
|---|---|
| `roundResultedCount === 0 && nowBeforeFirstLock` | `to come.` |
| `roundResultedCount > 0 && roundResultedCount < totalMatches` | `underway.` |
| `roundResultedCount === totalMatches` | `complete.` |
| `nowAfterFirstLock && roundResultedCount === 0` | `in progress.` |
| `!hasActiveTournament` | (hide banner) |

---

## Standings movers (after each round closes)

Three slots in the panel — biggest gainer, biggest faller, stuck.
Compute by diffing positions and points vs the previous round's snapshot.

### Biggest gainer

**When:** Player with the largest `+spots` movement; ties broken by points gained.

```
{name}
+{spots} spot{s} · +{points} points
{narrative}
```

`{narrative}` is one of these, selected by which is most true (in order):
- **Got the dark horse:** `Called the {seed}-seeded {playerName} upset; cost everyone else big.` (when `myUpsetPick && otherTippersMostlyMissed`)
- **Three in a row:** `Three {round} calls landed back-to-back.` (when `lastNcorrect >= 3`)
- **Sharper than the room:** `Converted {accuracyThisRound}% in {round} vs room avg {roomAccuracy}%.` (when `mineAccuracy > roomAvg + 20`)
- **Quiet climb:** `Same picks as last round; the field came back to them.` (when `noNewUpsets && othersDropped`)
- **No narrative:** fall back to `—`.

### Biggest faller

**When:** Player with the largest `−spots` movement.

```
{name}
−{spots} spots · {pointsDelta} points
{narrative}
```

`{narrative}` candidates:
- **Late to file:** `Last to file picks; squeezed out by the field.`
- **Punted the chalk:** `Punted {seed}-seeded {playerName}; cost momentum.`
- **Round of zeroes:** `Zero from {round} — first time this comp.`
- **Caught up:** `Field caught up while their {round} stalled.`
- Fall back: `—`.

### Stuck

**When:** Player whose `spots === 0` over the largest number of rounds.

```
{name}
± 0 spots · stuck for {nRounds} round{s}
{narrative}
```

`{narrative}` candidates:
- **Holding pattern:** `Even with the room — neither pulling away nor falling back.`
- **Same as the rest:** `Picked the favourites; got the favourites.`
- Fall back: `—`.

---

## Empty / error states

Apply these rules on top of all templates:

| State | Behaviour |
|---|---|
| No active tournament | Hide banner. Hide order of play, chart, by-the-numbers, pull quote. Dashboard headline: "Between Slams". |
| Tournament started, no resulted matches | Hide chart. Standings show `—` for points + accuracy. By-the-numbers: 0 / 0 / `—` / 0. |
| User has no tips filed for active tournament | Banner picks-in counter = 0. Use "Welcome" headline + body. Hide pull quote. |
| < 3 tippers | Hide "Lead over 2nd" stat. Replace with `Tippers` count. Skip "+N more" footer in standings. |
| Tied for 1st | Headline: "tied at the top" variant. Standings: render shared rank number (`1`) on each tied row, prefixed with `=`. |
| Round partially open (some matches unscheduled) | Order of play shows scheduled matches only, with `+N to be scheduled` footer. |
| Any required slot null | Drop the whole template. Use the one-line fallback (`{round} is underway.`) — never render `{undefined}` or empty interpolations. |
| Server returns 5xx / data fetch failed | Fall back to "From the editor" line + tab bar only. No data-derived blocks. Show a single muted line: `Couldn't load the latest. Refresh in a moment.` |

---

## Aussie English rules

- "tournament" / "round" — sentence case in body, capitalised only at start of sentence.
- "you're" / "they've" / "isn't" — contractions are fine in editorial copy.
- "tipper", "tip", "filed", "called", "punted", "the room" — these are the
  vocabulary. Match it.
- "Slam" (capitalised) when referring to a Grand Slam tournament.
- Spelling: "favourite", "colour", "judgement". No "z" where Brits use "s".
- No emoji. No exclamation marks (except the one in "G'day!" if absolutely
  needed — but prefer "Evening," instead).
