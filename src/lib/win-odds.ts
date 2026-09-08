// Each tipper's chance of finishing the tournament in first place.
//
// Worked out by playing the rest of the comp out many times and counting how
// often each person ends up on top. That is the only honest way to do it: the
// standings are decided by matches that have not been played, and the points
// left on the table can be worth more than the entire gap at the top.
//
// The model, stated plainly, because a number like this is easy to over-trust:
//
//  · Every undecided match between two known players is a coin flip. The comp
//    does not hold odds, and guessing them from seedings would dress up an
//    assumption as data. Fifty-fifty at least says what it is.
//  · Where someone has filed a tip, that tip decides whether they score. So
//    everyone who took Zverev rises and falls together, which is what actually
//    happens in a room like this.
//  · Where a match is still open and someone has not filed yet, they are
//    assumed to file, and to be right as often as they have been all
//    tournament. Where a match has already locked and they did not file, they
//    score nothing — that door is shut.
//  · Rounds that are not drawn yet have nobody's tips on them, so every player
//    is scored on their own accuracy for those.
//
// The result is a fair reading of who is in front and by how much. It is not a
// forecast of the tennis.

export interface OddsRound { id: string; points_per_correct_tip: number }
export interface OddsMatch {
  id: string
  round_id: string
  player1_name: string
  player2_name: string
  winner: string | null
  no_points: boolean
  scheduled_start: string
}
export interface OddsUser { id: string; display_name: string }
export interface OddsTip { user_id: string; match_id: string; predicted_winner: string }

export interface WinOdds {
  userId: string
  /** 0..1 chance of finishing first. A tie for first is shared between them. */
  chance: number
  /**
   * Whether first place is still arithmetically reachable. Winning none of the
   * simulated tournaments is not the same as being out, and the two must not
   * read the same way on the page.
   */
  alive: boolean
}

const TRIALS = 10_000

const isTbd = (n: string) => !n || /^tbd$/i.test(n.trim())

/** Small deterministic PRNG, so the same standings always give the same number. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function winOdds(input: {
  users: OddsUser[]
  rounds: OddsRound[]
  matches: OddsMatch[]
  tips: OddsTip[]
  now: Date
}): WinOdds[] {
  const { users, rounds, matches, tips, now } = input
  const n = users.length
  if (n === 0) return []

  const pointsOf = new Map(rounds.map(r => [r.id, r.points_per_correct_tip]))
  const scoring = (m: OddsMatch) => !m.no_points && (pointsOf.get(m.round_id) ?? 0) > 0
  const index = new Map(users.map((u, i) => [u.id, i]))

  // Where everyone stands now, and how often they have been right.
  const base = new Array(n).fill(0)
  const correct = new Array(n).fill(0)
  const judged = new Array(n).fill(0)
  const byMatch = new Map<string, OddsTip[]>()
  for (const t of tips) {
    const list = byMatch.get(t.match_id)
    if (list) list.push(t); else byMatch.set(t.match_id, [t])
  }
  for (const m of matches) {
    if (!scoring(m) || !m.winner) continue
    const pts = pointsOf.get(m.round_id) ?? 0
    for (const t of byMatch.get(m.id) ?? []) {
      const i = index.get(t.user_id)
      if (i === undefined) continue
      judged[i]++
      if (t.predicted_winner === m.winner) { correct[i]++; base[i] += pts }
    }
  }
  // Someone with nothing judged yet is treated as a coin flip rather than as
  // hopeless; anything else would hand them a zero they have not earned.
  const accuracy = users.map((_, i) => (judged[i] > 0 ? correct[i] / judged[i] : 0.5))

  // Everything still to be decided.
  const remaining = matches
    .filter(m => scoring(m) && !m.winner)
    .map(m => {
      const pts = pointsOf.get(m.round_id) ?? 0
      const drawn = !isTbd(m.player1_name) && !isTbd(m.player2_name)
      const locked = new Date(m.scheduled_start) <= now
      const picks = new Int8Array(n).fill(-1)   // -1 = no tip, 0 = player1, 1 = player2
      for (const t of byMatch.get(m.id) ?? []) {
        const i = index.get(t.user_id)
        if (i !== undefined) picks[i] = t.predicted_winner === 'player1' ? 0 : 1
      }
      return { pts, drawn, locked, picks }
    })

  // The most each person could still add: every remaining match they have
  // either tipped or can still tip. Points on a match that locked without
  // their tip are gone and must not be counted as reachable.
  const leaderBase = Math.max(...base)
  const alive = users.map((_, i) => {
    let reachable = 0
    for (const m of remaining) if (m.picks[i] !== -1 || !m.locked || !m.drawn) reachable += m.pts
    return base[i] + reachable >= leaderBase
  })

  if (remaining.length === 0) {
    // Nothing left to play: whoever is top has it, shared if level.
    const winners = base.filter(p => p === leaderBase).length
    return users.map((u, i) => ({
      userId: u.id,
      chance: base[i] === leaderBase ? 1 / winners : 0,
      alive: base[i] === leaderBase,
    }))
  }

  // Seeded on the state itself, so the figure only moves when the comp does —
  // not every time somebody refreshes the page.
  const rand = mulberry32(hashSeed(
    `${matches.filter(m => m.winner).length}|${tips.length}|${remaining.length}|${base.join(',')}`
  ))

  const wins = new Array(n).fill(0)
  const total = new Array(n).fill(0)

  for (let trial = 0; trial < TRIALS; trial++) {
    for (let i = 0; i < n; i++) total[i] = base[i]

    for (const m of remaining) {
      if (m.drawn) {
        const winner = rand() < 0.5 ? 0 : 1
        for (let i = 0; i < n; i++) {
          const pick = m.picks[i]
          if (pick === winner) total[i] += m.pts
          // Not filed yet and the match is still open: they will file, and be
          // right about as often as they have been.
          else if (pick === -1 && !m.locked && rand() < accuracy[i]) total[i] += m.pts
        }
      } else {
        // Not drawn yet, so nobody has tipped it. Score everyone on their own form.
        for (let i = 0; i < n; i++) if (rand() < accuracy[i]) total[i] += m.pts
      }
    }

    let best = -Infinity
    for (let i = 0; i < n; i++) if (total[i] > best) best = total[i]
    let tied = 0
    for (let i = 0; i < n; i++) if (total[i] === best) tied++
    for (let i = 0; i < n; i++) if (total[i] === best) wins[i] += 1 / tied
  }

  return users.map((u, i) => ({ userId: u.id, chance: wins[i] / TRIALS, alive: alive[i] }))
}

/**
 * Percentage for display. Someone who can still catch the leader always reads
 * at least "<1%", however badly the simulations went for them — a flat zero
 * would tell them they are out when they are not. Only the arithmetically
 * eliminated get a dash.
 */
export function formatChance(chance: number, alive: boolean): string {
  if (!alive) return '—'
  if (chance < 0.005) return '<1%'
  return `${Math.round(chance * 100)}%`
}
