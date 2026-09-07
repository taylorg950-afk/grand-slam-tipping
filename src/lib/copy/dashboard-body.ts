// Dashboard body-copy templates.
//
// Like the headline, each template carries a few wordings and settles on one
// for the day. Only the phrasing rotates — every number, name and privacy rule
// below is unchanged by it.
// See design-handoff/COPY-PATTERNS.md → "Dashboard body copy".
// Each template returns an array of paragraphs. The dashboard renders the
// first paragraph with a serif italic drop cap when dropCap is true and the
// first character of the lead line is a letter.

import { pickForDay } from './rotate'

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
  /** AEST day key — the wording holds for the day and turns over at local midnight. */
  dayKey: string
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
      paragraphs: [{ text: pickForDay(s.dayKey, 'off', [
        'Quiet on the wire. The next Slam will fire up here when its draw lands. Until then, practise your excuses.',
        'Nothing to call. The next draw lands here the moment it is published, and the arguing can resume.',
        'Off season, such as it is. A new draw will appear here without warning.',
      ]) }],
    }
  }

  // Welcome — first-time user with the tournament under way
  if (s.isFirstTimeUser && slotsPresent(s.nUnpicked, s.round, s.firstLock)) {
    return {
      template: 'welcome',
      paragraphs: [
        {
          dropCap: true,
          text: `Quiet so far. ${s.nUnpicked} matches sit unpicked across ${s.round}, with the first lock at ${s.firstLock}. Open Picks to file them; you can edit until the moment each match starts. ${pickForDay(s.dayKey, 'welcome', ['After that, your mistakes are permanent.', 'After that, they are on the record.', 'After that, no takebacks.'])}`,
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
            text: pickForDay(s.dayKey, 'opens', [
              `${s.round} fixtures are up. ${s.nMatches} matches to call, with the first lock at ${s.firstLock}.`,
              `${s.nMatches} matches of the ${s.round} are on the board. First one locks at ${s.firstLock}.`,
              `The ${s.round} draw has landed — ${s.nMatches} to call before ${s.firstLock}.`,
            ]),
          },
          {
            text: `${pickForDay(s.dayKey, 'lead', ['Highest-profile call', 'The one to watch', 'Pick of the round'])}: ${s.leadMatchP1} v ${s.leadMatchP2}. The room's leaning ${s.consensusPct}% toward ${s.consensus}. ${pickForDay(s.dayKey, 'room', ['The room has been wrong before.', 'The room is not always right.', 'Make of that what you will.'])}`,
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
            text: `The challenger, ${s.secondName}, sits ${s.gap} back ${pickForDay(s.dayKey, 'chal', ['and is rather too composed about it', 'and does not look worried', 'and is being very quiet about it'])}. With ${s.nextRound} worth ${s.nextRoundPts} points a pick, one afternoon of poor judgement is all it would take.`,
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
            text: `${s.city}'s ${s.surface} has been kind to the leader. ${s.yourName} sits on ${s.points} points — a ${s.accuracy}% hit rate across ${s.tipped} tips, ${s.gap} clear of the chase. ${pickForDay(s.dayKey, 'top', ['The view from the top is reportedly lovely.', 'Nothing to do now but hold it.', 'Long way down from here.'])}`,
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
            text: `${pickForDay(s.dayKey, 'chase', [`${s.leaderName} has the lead and, one assumes, the smugness that goes with it.`, `${s.leaderName} is in front, and enjoying it.`, `${s.leaderName} holds the lead for now.`])} You're ${s.gap} back on ${s.points} — well inside one strong round.`,
          },
          {
            text: `${s.nextRound} is worth ${s.nextRoundPts} per pick. ${pickForDay(s.dayKey, 'chase2', [`${s.leaderName} has to keep landing them; you only have to be right when it counts.`, `Every round from here is worth more than the last.`, `${s.leaderName} has more to lose than you do.`])}`,
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
            text: `${pickForDay(s.dayKey, 'back', ['The field has stretched out, and you\u2019ve given it a generous head start.', 'The field has gone on without you.', 'It has not, so far, been your tournament.'])} ${s.leaderName} is ${s.gap} ahead, with ${s.nAbove} tippers in between. ${s.nRoundsLeft} rounds to play and the bigger points still on the table — ${pickForDay(s.dayKey, 'back2', ['stranger things have happened, though not many.', 'it is not over, technically.', 'the maths is still on your side. Barely.'])}`,
          },
        ],
      }
    }
    return FALLBACK(s.round)
  }

  return FALLBACK(s.round)
}
