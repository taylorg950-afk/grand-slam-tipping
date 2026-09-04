// Short, self-refreshing notes for the dashboard's "Worth knowing" box.
//
// Everything here is derived from the comp's own data, so it changes on its own
// as results land — nothing to write by hand. Each candidate carries a weight;
// the box shows the best few.
//
// Rule II: a pick is private until its match locks. Anything that names who
// picked what therefore only ever reads locked matches.

export interface FactMatch {
  id: string
  round_id: string
  player1_name: string
  player2_name: string
  winner: string | null
  no_points: boolean
  scheduled_start: string
}
export interface FactRound { id: string; name: string; sort_order: number; points_per_correct_tip: number }
export interface FactUser { id: string; display_name: string }
export interface FactTip { user_id: string; match_id: string; predicted_winner: string }

export interface Fact { text: string; weight: number }

const ROUND_LONG: Record<string, string> = {
  R128: 'round of 128', R64: 'round of 64', R32: 'round of 32',
  R16: 'round of 16', QF: 'quarter-finals', SF: 'semi-finals', F: 'the final',
}

const strip = (n: string) => n.replace(/\s*\[.*?\]/, '').trim()
const seedOf = (n: string) => { const m = n.match(/\[(\d+)\]/); return m ? Number(m[1]) : null }
const sideName = (m: FactMatch, side: string) => strip(side === 'player1' ? m.player1_name : m.player2_name)

export function buildFacts(input: {
  users: FactUser[]
  rounds: FactRound[]
  matches: FactMatch[]
  tips: FactTip[]
  now: Date
}): string[] {
  const { users, rounds, matches, tips, now } = input
  const tipped = rounds.filter(r => r.points_per_correct_tip > 0).sort((a, b) => a.sort_order - b.sort_order)
  const roundOf = new Map(rounds.map(r => [r.id, r]))
  const locked = (m: FactMatch) => new Date(m.scheduled_start) <= now
  const facts: Fact[] = []
  const nUsers = users.length
  const nameById = new Map(users.map(u => [u.id, u.display_name]))

  // ── Seeds already out ────────────────────────────────────────────────
  const seedsOut = new Set<string>()
  for (const m of matches) {
    if (!m.winner) continue
    const loser = m.winner === 'player1' ? m.player2_name : m.player1_name
    if (seedOf(loser) !== null) seedsOut.add(strip(loser))
  }
  if (seedsOut.size >= 3) {
    facts.push({ text: `${seedsOut.size} of the 32 seeds are already out.`, weight: 40 })
  }

  // ── Biggest scalp so far: best seed beaten, and how many saw it coming ─
  let bestUpset: { seed: number; winner: string; loser: string; sawIt: number } | null = null
  for (const m of matches) {
    if (!m.winner || m.no_points) continue
    const loserRaw = m.winner === 'player1' ? m.player2_name : m.player1_name
    const winnerRaw = m.winner === 'player1' ? m.player1_name : m.player2_name
    const ls = seedOf(loserRaw), ws = seedOf(winnerRaw)
    if (ls === null) continue
    if (ws !== null && ws <= ls) continue      // higher seed winning is not an upset
    if (!bestUpset || ls < bestUpset.seed) {
      const on = tips.filter(t => t.match_id === m.id)
      bestUpset = {
        seed: ls, winner: strip(winnerRaw), loser: strip(loserRaw),
        sawIt: on.filter(t => t.predicted_winner === m.winner).length,
      }
    }
  }
  if (bestUpset && bestUpset.seed <= 16) {
    const { winner, loser, seed, sawIt } = bestUpset
    facts.push({
      text: sawIt === 0
        ? `${winner} knocking out ${loser} [${seed}] is the biggest scalp so far — nobody in the room called it.`
        : `${winner} beat ${loser} [${seed}] — only ${sawIt} of ${nUsers} had it.`,
      weight: sawIt === 0 ? 95 : 80,
    })
  }

  // ── Matches in play right now: where the room disagrees ──────────────
  // Only locked matches, and only ones still being played — a pick is private
  // until lock, and once a match is decided the present tense reads wrong.
  const inPlay = matches.filter(m =>
    locked(m) && !m.winner && (roundOf.get(m.round_id)?.points_per_correct_tip ?? 0) > 0)

  for (const m of inPlay) {
    const on = tips.filter(t => t.match_id === m.id)
    if (on.length < Math.max(4, Math.floor(nUsers * 0.6))) continue
    const p1 = on.filter(t => t.predicted_winner === 'player1').length
    const p2 = on.length - p1
    const minority = Math.min(p1, p2)

    if (minority === 0) {
      facts.push({
        text: `The whole room is on ${sideName(m, p1 ? 'player1' : 'player2')} today — all ${on.length} of us.`,
        weight: 55,
      })
    } else if (minority === 1) {
      const oddSide = p1 < p2 ? 'player1' : 'player2'
      const odd = on.find(t => t.predicted_winner === oddSide)
      const who = odd ? nameById.get(odd.user_id) : null
      if (who) {
        facts.push({
          text: `${who} is the only one on ${sideName(m, oddSide)} — the other ${on.length - 1} took ${sideName(m, oddSide === 'player1' ? 'player2' : 'player1')}.`,
          weight: 90,
        })
      }
    } else if (Math.abs(p1 - p2) <= 1) {
      facts.push({
        text: `Nothing splits the room like ${strip(m.player1_name)} v ${strip(m.player2_name)} — ${Math.max(p1, p2)}–${minority}.`,
        weight: 70,
      })
    }
  }

  // ── Someone who stood alone and was right ────────────────────────────
  // Past tense, and only when the lone pick actually came off — being the only
  // one wrong is not a fun fact about anybody.
  const recent = [...matches]
    .filter(m => m.winner && !m.no_points && (roundOf.get(m.round_id)?.points_per_correct_tip ?? 0) > 0)
    .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())
    .slice(0, 24)
  for (const m of recent) {
    const on = tips.filter(t => t.match_id === m.id)
    if (on.length < Math.max(4, Math.floor(nUsers * 0.6))) continue
    const right = on.filter(t => t.predicted_winner === m.winner)
    if (right.length !== 1) continue
    const who = nameById.get(right[0].user_id)
    if (!who) continue
    facts.push({
      text: `${who} was the only one who called ${sideName(m, m.winner!)} over ${sideName(m, m.winner === 'player1' ? 'player2' : 'player1')}.`,
      weight: 88,
    })
    break
  }

  // ── A clean sweep in the last completed round ─────────────────────────
  const lastDone = [...tipped].reverse().find(r => {
    const rm = matches.filter(m => m.round_id === r.id)
    return rm.length > 0 && rm.every(m => m.winner)
  })
  if (lastDone) {
    const rm = matches.filter(m => m.round_id === lastDone.id && m.winner && !m.no_points)
    const perfect = users.filter(u => {
      const mine = tips.filter(t => t.user_id === u.id && rm.some(m => m.id === t.match_id))
      return mine.length === rm.length && mine.every(t => rm.find(m => m.id === t.match_id)!.winner === t.predicted_winner)
    })
    if (perfect.length === 1) {
      facts.push({ text: `${perfect[0].display_name} went ${rm.length} from ${rm.length} in the ${ROUND_LONG[lastDone.name] ?? lastDone.name}.`, weight: 92 })
    } else if (perfect.length > 1) {
      facts.push({ text: `${perfect.length} of us got every match in the ${ROUND_LONG[lastDone.name] ?? lastDone.name}.`, weight: 60 })
    }
  }

  // ── How tight the table is ───────────────────────────────────────────
  const pts = new Map<string, number>()
  for (const u of users) pts.set(u.id, 0)
  for (const t of tips) {
    const m = matches.find(x => x.id === t.match_id)
    if (!m?.winner || m.no_points) continue
    if (t.predicted_winner !== m.winner) continue
    pts.set(t.user_id, (pts.get(t.user_id) ?? 0) + (roundOf.get(m.round_id)?.points_per_correct_tip ?? 0))
  }
  const ranked = [...pts.values()].sort((a, b) => b - a)
  if (ranked.length >= 4 && ranked[0] > 0) {
    const spread = ranked[0] - ranked[ranked.length - 1]
    const topFive = ranked[0] - ranked[Math.min(4, ranked.length - 1)]
    if (spread <= 40) facts.push({ text: `Just ${spread} points covers the entire table.`, weight: 75 })
    else if (topFive <= 12) facts.push({ text: `The top five are within ${topFive} points of each other.`, weight: 65 })
  }

  return facts.sort((a, b) => b.weight - a.weight).slice(0, 3).map(f => f.text)
}
