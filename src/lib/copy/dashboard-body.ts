// Deterministic dashboard body-copy templates.
// See design-handoff/COPY-PATTERNS.md → "Dashboard body copy".
// Each template returns an array of paragraphs. The dashboard renders the
// first paragraph with a serif italic drop cap when dropCap is true and the
// first character of the lead line is a letter.

export interface BodyState {
  hasActiveTournament: boolean
  isFirstTimeUser: boolean
  rank: number | null
  numTippers: number
  yourName: string
  leaderName: string
  secondName: string | null
  points: number
  leaderPts: number
  gap: number
  leaderAccuracy: number | null
  secondAccuracy: number | null
  secondTipped: number
  accuracy: number | null
  tipped: number
  city: string
  surface: string
  round: string
  roundResultedCount: number
  currentRoundMatchCount: number
  firstRoundName: string | null
  secondRoundName: string | null
  r1Correct: number | null
  r1Total: number | null
  r2Correct: number | null
  r2Total: number | null
  nextRound: string | null
  nextRoundPts: number | null
  leadMatchP1: string | null
  leadMatchP2: string | null
  consensus: string | null
  consensusPct: number | null
  nonConsensusCount: number | null
  leadMatchLockTime: string | null
  firstLock: string | null
  nMatches: number | null
  nUnpicked: number | null
  nAbove: number | null
  nRoundsLeft: number | null
}

export interface BodyParagraph {
  text: string
  dropCap?: boolean
}

export interface Body {
  template: 'leader' | 'chaser' | 'round-opens' | 'welcome' | 'down-the-back' | 'fallback'
  paragraphs: BodyParagraph[]
}

const FALLBACK = (round: string): Body => ({
  template: 'fallback',
  paragraphs: [{ text: `${round} is underway. Open Picks to file them.` }],
})

function slotsPresent(...vals: Array<unknown>): boolean {
  return vals.every(v => v !== null && v !== undefined)
}

export function dashboardBody(s: BodyState): Body {
  if (!s.hasActiveTournament) {
    return {
      template: 'fallback',
      paragraphs: [{ text: 'Quiet on the wire. The next Slam will fire up here when its draw lands.' }],
    }
  }

  // Welcome — first-time user with the tournament under way
  if (s.isFirstTimeUser && slotsPresent(s.nUnpicked, s.round, s.firstLock)) {
    return {
      template: 'welcome',
      paragraphs: [
        {
          dropCap: true,
          text: `Quiet so far. ${s.nUnpicked} matches sit unpicked across ${s.round}, with the first lock at ${s.firstLock}. Open Picks to file them; you can edit until the moment each match starts.`,
        },
      ],
    }
  }

  // Round opens — no resulted matches in the current round yet
  if (s.roundResultedCount === 0 && (s.currentRoundMatchCount ?? 0) > 0) {
    if (slotsPresent(s.nMatches, s.firstLock, s.leadMatchP1, s.leadMatchP2, s.consensusPct, s.consensus, s.round)) {
      return {
        template: 'round-opens',
        paragraphs: [
          {
            dropCap: true,
            text: `${s.round} fixtures are up. ${s.nMatches} matches to call, with the first lock at ${s.firstLock}.`,
          },
          {
            text: `Highest-profile call: ${s.leadMatchP1} v ${s.leadMatchP2}. The room's leaning ${s.consensusPct}% toward ${s.consensus}. Your move.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  // Leader — rank 1 with at least one resulted match
  if (s.rank === 1 && s.roundResultedCount > 0) {
    if (
      slotsPresent(
        s.r1Correct, s.r1Total, s.firstRoundName,
        s.r2Correct, s.r2Total, s.secondRoundName,
        s.accuracy, s.tipped,
        s.secondName, s.secondAccuracy, s.secondTipped,
        s.nextRound, s.nextRoundPts,
        s.consensus, s.consensusPct, s.nonConsensusCount, s.leadMatchLockTime,
      )
    ) {
      return {
        template: 'leader',
        paragraphs: [
          {
            dropCap: true,
            text: `${s.city}'s ${s.surface} has been kind to the leader. With ${s.r1Correct} of ${s.r1Total} ${s.firstRoundName} picks landing then ${s.r2Correct} of ${s.r2Total} in ${s.secondRoundName}, ${s.yourName} now sits on ${s.points} points — a ${s.accuracy}% hit rate across ${s.tipped} tips.`,
          },
          {
            text: `The challenger, ${s.secondName}, has been quieter on volume but sharper, converting ${s.secondAccuracy}% of ${s.secondTipped} tips. With ${s.nextRound} worth ${s.nextRoundPts} points each, the gap could close in an afternoon.`,
          },
          {
            text: `The room is in agreement on the day's lead match. ${s.consensus} draws ${s.consensusPct}% support; only ${s.nonConsensusCount} tipper(s) called the upset. Locks at ${s.leadMatchLockTime}.`,
          },
        ],
      }
    }
    // Drop to a shorter leader paragraph if some slots are missing but core data is there
    if (slotsPresent(s.accuracy, s.tipped)) {
      return {
        template: 'leader',
        paragraphs: [
          {
            dropCap: true,
            text: `${s.city}'s ${s.surface} has been kind to the leader. ${s.yourName} sits on ${s.points} points — a ${s.accuracy}% hit rate across ${s.tipped} tips, with ${s.gap} points clear of the chase.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  // Chaser — rank 2–4 with at least one resulted match
  if (s.rank != null && s.rank >= 2 && s.rank <= 4 && s.roundResultedCount > 0) {
    if (slotsPresent(s.leaderName, s.leaderPts, s.leaderAccuracy, s.gap, s.points, s.nextRound, s.nextRoundPts)) {
      return {
        template: 'chaser',
        paragraphs: [
          {
            dropCap: true,
            text: `${s.leaderName} sits on ${s.leaderPts} after a ${s.leaderAccuracy}% run through the early rounds. You're ${s.gap} back on ${s.points} — well inside one strong round.`,
          },
          {
            text: `${s.nextRound} is worth ${s.nextRoundPts} per pick. ${s.leaderName} would need to keep landing them; a sharper ${s.nextRound} from you puts the title back in play.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  // Down the back — rank 5+
  if (s.rank != null && s.rank >= 5 && s.numTippers >= 8) {
    if (slotsPresent(s.leaderName, s.leaderPts, s.gap, s.nAbove, s.nRoundsLeft)) {
      return {
        template: 'down-the-back',
        paragraphs: [
          {
            dropCap: true,
            text: `The field has stretched out. ${s.leaderName} sits on ${s.leaderPts}, ${s.gap} ahead of you; ${s.nAbove} tippers in between. With ${s.nRoundsLeft} rounds to play and the bigger points still on the table, this isn't done — but it'd take a near-perfect run from here.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  return FALLBACK(s.round)
}
