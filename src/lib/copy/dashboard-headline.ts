// Deterministic dashboard headline templates.
// See design-handoff/COPY-PATTERNS.md → "Dashboard headline".
// line2 is rendered italic in the dashboard.

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
        : 'Next match on the wire soon.',
    }
  }

  if (s.tournamentComplete) {
    // Only the champion sees the winning total — nobody else's score is aired.
    if (s.rank === 1) {
      return {
        kicker: 'Champion',
        line1: `${s.yourName} takes ${s.city}`,
        line2: s.finalPoints != null ? `on ${s.finalPoints}. Take a bow.` : 'Take a bow.',
      }
    }
    return {
      kicker: 'Tournament complete',
      line1: `${s.leaderName} takes ${s.city}.`,
      line2: 'There’s always the next one.',
    }
  }

  if (s.isFirstTimeUser && s.numUnpickedMatches && s.numUnpickedMatches > 0) {
    return {
      kicker: 'Welcome',
      line1: 'Welcome to the comp.',
      line2: `${s.numUnpickedMatches} matches need your call. No pressure.`,
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
      line1: `${s.round} opens.`,
      line2: s.locksIn ? `First lock in ${s.locksIn}.` : 'First lock imminent.',
    }
  }

  if (s.rank === 1 && s.gap >= 10) {
    return {
      kicker: 'Leading',
      line1: `${s.yourName} holds ${s.gap}-point lead`,
      line2: `as ${s.city} hits the ${s.round}.`,
    }
  }

  if (s.rank === 1 && s.gap < 10) {
    return {
      kicker: 'Leading narrowly',
      line1: `${s.yourName} clings to a ${s.gap}-point lead`,
      line2: `as ${s.round} closes in. Don’t look down.`,
    }
  }

  if (s.rank != null && s.rank >= 2 && s.rank <= 4) {
    return {
      kicker: 'In the pack',
      line1: `${s.leaderName} leads by ${s.gap};`,
      line2: `you lurk in ${ordinal(s.rank)}.`,
    }
  }

  return {
    kicker: 'Down the back',
    line1: `${s.leaderName} runs away with ${s.city};`,
    line2: 'you remain, officially, a contender.',
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}
