// Dashboard headline templates.
// See design-handoff/COPY-PATTERNS.md → "Dashboard headline".
// line2 is rendered italic in the dashboard.
//
// Each branch offers a few wordings and settles on one for the day, so the top
// of the dashboard does not read identically two mornings running. The state
// decides which branch applies and supplies every number; rotation only ever
// changes how that is phrased.

import { pickForDay } from './rotate'

export interface HeadlineState {
  hasActiveTournament: boolean
  isFirstTimeUser: boolean
  rank: number | null
  numTippers: number
  gap: number
  leaderName: string
  yourName: string
  city: string
  round: string
  /** AEST day key — the wording holds for the day and turns over at local midnight. */
  dayKey: string
  roundResultedCount: number
  tournamentComplete: boolean
  tiedAtTop?: boolean
  tiedNames?: string[]
  tiedPoints?: number
  finalPoints?: number
  nextTournament?: string
  nextTournamentDate?: string
  numUnpickedMatches?: number
  locksIn?: string
}

export interface Headline {
  kicker: string
  line1: string
  line2: string
}

export function dashboardHeadline(s: HeadlineState): Headline {
  if (!s.hasActiveTournament) {
    return {
      kicker: 'Between Slams',
      line1: 'Between Slams.',
      line2: s.nextTournament && s.nextTournamentDate
        ? `${s.nextTournament} opens ${s.nextTournamentDate}.`
        : pickForDay(s.dayKey, 'between', [
            'Next match on the wire soon.',
            'The wire is quiet. It won’t last.',
            'Nothing to call. Enjoy it while it lasts.',
          ]),
    }
  }

  if (s.tournamentComplete) {
    // Only the champion sees the winning total — nobody else's score is aired.
    if (s.rank === 1) {
      return {
        kicker: 'Champion',
        line1: `${s.yourName} takes ${s.city}`,
        line2: s.finalPoints != null
          ? `on ${s.finalPoints}. ${pickForDay(s.dayKey, 'champ', ['Take a bow.', 'Nobody can touch that.', 'Earned, apparently.'])}`
          : pickForDay(s.dayKey, 'champ', ['Take a bow.', 'Nobody can touch that.', 'Earned, apparently.']),
      }
    }
    return {
      kicker: 'Tournament complete',
      line1: `${s.leaderName} takes ${s.city}.`,
      line2: pickForDay(s.dayKey, 'done', [
        'There’s always the next one.',
        'Regroup. Another draw is coming.',
        'Filed under: next time.',
      ]),
    }
  }

  if (s.isFirstTimeUser && s.numUnpickedMatches && s.numUnpickedMatches > 0) {
    return {
      kicker: 'Welcome',
      line1: 'Welcome to the comp.',
      line2: `${s.numUnpickedMatches} matches need your call. ${pickForDay(s.dayKey, 'welcome', ['No pressure.', 'Start anywhere.', 'Everyone starts level.'])}`,
    }
  }

  if (s.tiedAtTop) {
    const others = s.tiedNames ?? []
    const sharedPts = s.tiedPoints ?? 0
    const tail =
      others.length === 0
        ? `on ${sharedPts}.`
        : others.length === 1
          ? `with ${others[0]} on ${sharedPts}. Awkward.`
          : `with ${others[0]} and ${others.length - 1} others on ${sharedPts}. Cosy.`
    return {
      kicker: 'Tied at the top',
      line1: `${s.yourName} tied at the top`,
      line2: tail,
    }
  }

  if (s.roundResultedCount === 0) {
    return {
      kicker: 'Round opens',
      line1: pickForDay(s.dayKey, 'opens1', [
        `${s.round} opens.`,
        `${s.round} is on the board.`,
        `${s.round} is live.`,
      ]),
      line2: s.locksIn
        ? pickForDay(s.dayKey, 'opens2', [
            `First lock in ${s.locksIn}.`,
            `${s.locksIn} to get them in.`,
            `Clock’s running — ${s.locksIn}.`,
          ])
        : 'First lock imminent.',
    }
  }

  if (s.rank === 1 && s.gap >= 10) {
    return {
      kicker: 'Leading',
      line1: pickForDay(s.dayKey, 'lead1', [
        `${s.yourName} holds ${s.gap}-point lead`,
        `${s.yourName} is ${s.gap} clear`,
        `${s.yourName} out front by ${s.gap}`,
      ]),
      line2: pickForDay(s.dayKey, 'lead2', [
        `as ${s.city} hits the ${s.round}.`,
        `with the ${s.round} still to play.`,
        `and ${s.city} reaches the ${s.round}.`,
      ]),
    }
  }

  if (s.rank === 1 && s.gap < 10) {
    return {
      kicker: 'Leading narrowly',
      line1: pickForDay(s.dayKey, 'narrow1', [
        `${s.yourName} clings to a ${s.gap}-point lead`,
        `${s.yourName} ahead by ${s.gap}, and barely`,
        `${s.gap} points is all ${s.yourName} has`,
      ]),
      line2: pickForDay(s.dayKey, 'narrow2', [
        `as ${s.round} closes in. Don’t look down.`,
        `with the ${s.round} next. Nervous yet?`,
        `and the ${s.round} to survive.`,
      ]),
    }
  }

  if (s.rank != null && s.rank >= 2 && s.rank <= 4) {
    return {
      kicker: 'In the pack',
      line1: pickForDay(s.dayKey, 'pack1', [
        `${s.leaderName} leads by ${s.gap};`,
        `${s.gap} points to ${s.leaderName};`,
        `${s.leaderName} is ${s.gap} up the road;`,
      ]),
      line2: pickForDay(s.dayKey, 'pack2', [
        `you lurk in ${ordinal(s.rank)}.`,
        `you sit ${ordinal(s.rank)}, waiting.`,
        `${ordinal(s.rank)} and within range.`,
      ]),
    }
  }

  return {
    kicker: 'Down the back',
    line1: pickForDay(s.dayKey, 'back1', [
      `${s.leaderName} runs away with ${s.city};`,
      `${s.leaderName} is out of sight;`,
      `${s.city} belongs to ${s.leaderName};`,
    ]),
    line2: pickForDay(s.dayKey, 'back2', [
      'you remain, officially, a contender.',
      'you remain, technically, in the comp.',
      'the maths still works. Just.',
    ]),
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
