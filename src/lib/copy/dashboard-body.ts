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
      paragraphs: [{ text: 'Quiet on the wire. The next Slam will fire up here when its draw lands. Until then, practise your excuses.' }],
    }
  }

  // Welcome — first-time user with the tournament under way
  if (s.isFirstTimeUser && slotsPresent(s.nUnpicked, s.round, s.firstLock)) {
    return {
      template: 'welcome',
      paragraphs: [
        {
          dropCap: true,
          text: `Quiet so far. ${s.nUnpicked} matches sit unpicked across ${s.round}, with the first lock at ${s.firstLock}. Open Picks to file them; you can edit until the moment each match starts. After that, your mistakes are permanent.`,
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
            text: `Highest-profile call: ${s.leadMatchP1} v ${s.leadMatchP2}. The room's leaning ${s.consensusPct}% toward ${s.consensus}. The room has been wrong before.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  // Leader — rank 1 with at least one resulted match
  if (s.rank === 1 && s.roundResultedCount > 0) {
    // Only the viewer's own numbers are aired — the challenger stays a name
    // and a gap, never a score or strike rate.
    if (
      slotsPresent(
        s.r1Correct, s.r1Total, s.firstRoundName,
        s.r2Correct, s.r2Total, s.secondRoundName,
        s.accuracy, s.tipped,
        s.secondName,
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
            text: `The challenger, ${s.secondName}, sits ${s.gap} back and is rather too composed about it. With ${s.nextRound} worth ${s.nextRoundPts} points a pick, one afternoon of poor judgement is all it would take.`,
          },
          {
            text: `The room is in agreement on the day's lead match. ${s.consensus} draws ${s.consensusPct}% support; only ${s.nonConsensusCount} tipper(s) fancy the upset. Locks at ${s.leadMatchLockTime}.`,
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
            text: `${s.city}'s ${s.surface} has been kind to the leader. ${s.yourName} sits on ${s.points} points — a ${s.accuracy}% hit rate across ${s.tipped} tips, ${s.gap} clear of the chase. The view from the top is reportedly lovely.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  // Chaser — rank 2–4 with at least one resulted match
  if (s.rank != null && s.rank >= 2 && s.rank <= 4 && s.roundResultedCount > 0) {
    // The leader is named but their points and strike rate are not aired.
    if (slotsPresent(s.leaderName, s.gap, s.points, s.nextRound, s.nextRoundPts)) {
      return {
        template: 'chaser',
        paragraphs: [
          {
            dropCap: true,
            text: `${s.leaderName} has the lead and, one assumes, the smugness that goes with it. You're ${s.gap} back on ${s.points} — well inside one strong round.`,
          },
          {
            text: `${s.nextRound} is worth ${s.nextRoundPts} per pick. ${s.leaderName} has to keep landing them; you only have to be right when it counts.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  // Down the back — rank 5+
  if (s.rank != null && s.rank >= 5 && s.numTippers >= 8) {
    // Same rule down here — the leader's total stays off the page.
    if (slotsPresent(s.leaderName, s.gap, s.nAbove, s.nRoundsLeft)) {
      return {
        template: 'down-the-back',
        paragraphs: [
          {
            dropCap: true,
            text: `The field has stretched out, and you've given it a generous head start. ${s.leaderName} is ${s.gap} ahead, with ${s.nAbove} tippers in between. ${s.nRoundsLeft} rounds to play and the bigger points still on the table — stranger things have happened, though not many.`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  return FALLBACK(s.round)
}
