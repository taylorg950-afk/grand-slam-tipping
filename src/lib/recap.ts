// One person's tournament, summarised.
//
// Everything here is derived from tips and results, so it fills in as the comp
// runs and reads as a full recap once the final is done. Nothing is stored.

export interface RecapRound { id: string; name: string; sort_order: number; points_per_correct_tip: number }
export interface RecapMatch {
  id: string
  round_id: string
  player1_name: string
  player2_name: string
  winner: string | null
  no_points: boolean
  scheduled_start: string
}
export interface RecapUser { id: string; display_name: string }
export interface RecapTip { user_id: string; match_id: string; predicted_winner: string }

export interface Recap {
  position: number
  players: number
  points: number
  correct: number
  judged: number
  /** 0..1, or null before anything has been judged. */
  accuracy: number | null
  /** The round they took the most points out of. */
  bestRound: { name: string; correct: number; total: number; points: number } | null
  /** Longest run of correct calls, in the order the matches were played. */
  longestStreak: number
  /** Best position held at the end of any round, and the worst. */
  highestPosition: number | null
  lowestPosition: number | null
  /** The biggest seed they called out, and how many others saw it too. */
  bestCall: { winner: string; loser: string; seed: number; alsoHadIt: number } | null
  /** Times they went against the majority and were proved right. */
  againstTheRoom: number
  /** Nearest rival on points, and which side of them they sit. */
  closest: { name: string; gap: number; above: boolean } | null
  /** Judged matches they never filed a tip for, and what that cost. */
  missed: { count: number; points: number }
  /** The player who most often beat the person they had picked. */
  nemesis: { player: string; times: number } | null
  /** The player they backed most often and were right about. */
  talisman: { player: string; times: number } | null
}

const strip = (n: string) => n.replace(/\s*\[.*?\]/, '').trim()
const seedOf = (n: string) => { const m = n.match(/\[(\d+)\]/); return m ? Number(m[1]) : null }

export function buildRecap(input: {
  userId: string
  users: RecapUser[]
  rounds: RecapRound[]
  matches: RecapMatch[]
  tips: RecapTip[]
}): Recap | null {
  const { userId, users, rounds, matches, tips } = input
  const tipped = rounds.filter(r => r.points_per_correct_tip > 0).sort((a, b) => a.sort_order - b.sort_order)
  if (tipped.length === 0 || users.length === 0) return null

  const roundOf = new Map(rounds.map(r => [r.id, r]))
  const pts = (m: RecapMatch) => roundOf.get(m.round_id)?.points_per_correct_tip ?? 0
  const judgedMatch = (m: RecapMatch) => !!m.winner && !m.no_points && pts(m) > 0

  const byMatch = new Map<string, RecapTip[]>()
  for (const t of tips) {
    const list = byMatch.get(t.match_id)
    if (list) list.push(t); else byMatch.set(t.match_id, [t])
  }

  // Totals for everyone, so a position can be put on it.
  const totals = new Map(users.map(u => [u.id, 0]))
  for (const m of matches) {
    if (!judgedMatch(m)) continue
    for (const t of byMatch.get(m.id) ?? []) {
      if (t.predicted_winner === m.winner) totals.set(t.user_id, (totals.get(t.user_id) ?? 0) + pts(m))
    }
  }
  // Ranked the way the standings are: points, then name to break a tie.
  const order = [...users].sort((a, b) =>
    (totals.get(b.id) ?? 0) - (totals.get(a.id) ?? 0) || a.display_name.localeCompare(b.display_name))
  const position = order.findIndex(u => u.id === userId) + 1
  if (position === 0) return null

  const mine = tips.filter(t => t.user_id === userId)
  const mineByMatch = new Map(mine.map(t => [t.match_id, t.predicted_winner]))

  let correct = 0
  let judged = 0
  for (const m of matches) {
    if (!judgedMatch(m)) continue
    const pick = mineByMatch.get(m.id)
    if (!pick) continue
    judged++
    if (pick === m.winner) correct++
  }

  // Best round by points taken.
  let bestRound: Recap['bestRound'] = null
  for (const r of tipped) {
    const rm = matches.filter(m => m.round_id === r.id && judgedMatch(m))
    if (rm.length === 0) continue
    const got = rm.filter(m => mineByMatch.get(m.id) === m.winner).length
    const scored = got * r.points_per_correct_tip
    if (!bestRound || scored > bestRound.points) {
      bestRound = { name: r.name, correct: got, total: rm.length, points: scored }
    }
  }

  // Longest run of correct calls, in the order matches were actually played.
  const played = matches
    .filter(m => judgedMatch(m) && mineByMatch.has(m.id))
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
  let longestStreak = 0
  let run = 0
  for (const m of played) {
    if (mineByMatch.get(m.id) === m.winner) { run++; if (run > longestStreak) longestStreak = run }
    else run = 0
  }

  // Position held at the end of each completed round.
  let highestPosition: number | null = null
  let lowestPosition: number | null = null
  const running = new Map(users.map(u => [u.id, 0]))
  for (const r of tipped) {
    const rm = matches.filter(m => m.round_id === r.id && judgedMatch(m))
    if (rm.length === 0) continue
    for (const m of rm) {
      for (const t of byMatch.get(m.id) ?? []) {
        if (t.predicted_winner === m.winner) running.set(t.user_id, (running.get(t.user_id) ?? 0) + pts(m))
      }
    }
    const standing = [...users].sort((a, b) =>
      (running.get(b.id) ?? 0) - (running.get(a.id) ?? 0) || a.display_name.localeCompare(b.display_name))
    const at = standing.findIndex(u => u.id === userId) + 1
    if (at > 0) {
      if (highestPosition === null || at < highestPosition) highestPosition = at
      if (lowestPosition === null || at > lowestPosition) lowestPosition = at
    }
  }

  // Best call: the highest seed they saw beaten.
  let bestCall: Recap['bestCall'] = null
  let againstTheRoom = 0
  for (const m of matches) {
    if (!judgedMatch(m)) continue
    const pick = mineByMatch.get(m.id)
    if (pick !== m.winner) continue

    const on = byMatch.get(m.id) ?? []
    const withMe = on.filter(t => t.predicted_winner === pick).length
    if (on.length >= 4 && withMe * 2 < on.length) againstTheRoom++

    const loserRaw = m.winner === 'player1' ? m.player2_name : m.player1_name
    const winnerRaw = m.winner === 'player1' ? m.player1_name : m.player2_name
    const ls = seedOf(loserRaw)
    const ws = seedOf(winnerRaw)
    if (ls === null) continue
    if (ws !== null && ws <= ls) continue          // the better seed winning is no upset
    if (!bestCall || ls < bestCall.seed) {
      bestCall = { winner: strip(winnerRaw), loser: strip(loserRaw), seed: ls, alsoHadIt: withMe - 1 }
    }
  }

  // Nearest rival on points. A tie counts as a gap of zero and reads as such.
  let closest: Recap['closest'] = null
  const myPoints = totals.get(userId) ?? 0
  for (const u of users) {
    if (u.id === userId) continue
    const theirs = totals.get(u.id) ?? 0
    const gap = Math.abs(theirs - myPoints)
    if (!closest || gap < closest.gap) closest = { name: u.display_name, gap, above: theirs > myPoints }
  }

  // Matches that were scored while they had nothing filed.
  let missedCount = 0
  let missedPoints = 0
  for (const m of matches) {
    if (!judgedMatch(m)) continue
    if (mineByMatch.has(m.id)) continue
    missedCount++
    missedPoints += pts(m)
  }

  // Who kept beating the player they had backed, and who kept delivering.
  const beatMe = new Map<string, number>()
  const cameGood = new Map<string, number>()
  for (const m of matches) {
    if (!judgedMatch(m)) continue
    const pick = mineByMatch.get(m.id)
    if (!pick) continue
    const winnerName = strip(m.winner === 'player1' ? m.player1_name : m.player2_name)
    if (pick === m.winner) cameGood.set(winnerName, (cameGood.get(winnerName) ?? 0) + 1)
    else beatMe.set(winnerName, (beatMe.get(winnerName) ?? 0) + 1)
  }
  const top = (map: Map<string, number>) => {
    let best: { player: string; times: number } | null = null
    for (const [player, times] of map) {
      if (!best || times > best.times || (times === best.times && player.localeCompare(best.player) < 0)) {
        best = { player, times }
      }
    }
    // One occurrence is a coincidence, not a pattern worth naming.
    return best && best.times >= 2 ? best : null
  }

  return {
    position,
    players: users.length,
    points: totals.get(userId) ?? 0,
    correct,
    judged,
    accuracy: judged > 0 ? correct / judged : null,
    bestRound,
    longestStreak,
    highestPosition,
    lowestPosition,
    bestCall,
    againstTheRoom,
    closest,
    missed: { count: missedCount, points: missedPoints },
    nemesis: top(beatMe),
    talisman: top(cameGood),
  }
}
