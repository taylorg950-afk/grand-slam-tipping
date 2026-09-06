// Short, self-refreshing notes for the dashboard's "Worth knowing" box.
//
// Everything here is derived from the comp's own data, so it changes on its own
// as results land — nothing to write by hand.
//
// Each candidate carries a weight, but weight alone would pin the same three
// notes in place for days: the biggest upset of the tournament stays the
// biggest upset. So a fact tied to a match also carries that match's date and
// loses ground as the match recedes, and a seed that turns over at AEST
// midnight reshuffles facts of similar standing. The box therefore reads
// differently each day without anything being written by hand.
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

export interface Fact {
  text: string
  weight: number
  /** The match this is about, if any — used to fade the fact as it ages. */
  at?: string
}

/** How much weight a match-derived fact sheds per day of age. */
const DECAY_PER_DAY = 14
/** Most of a fact's weight that age can take; a good fact never vanishes. */
const MAX_DECAY = 0.6
/** How far the daily reshuffle can move a fact up or down the order. */
const DAILY_SPREAD = 22

/** Stable 0..1 hash, so a given fact sits in the same place all day. */
function hash01(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967295
}

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
  let bestUpset: { seed: number; winner: string; loser: string; sawIt: number; at: string; id: string } | null = null
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
        at: m.scheduled_start, id: m.id,
      }
    }
  }
  if (bestUpset && bestUpset.seed <= 16) {
    const { winner, loser, seed, sawIt, at } = bestUpset
    facts.push({
      text: sawIt === 0
        ? `${winner} knocking out ${loser} [${seed}] is the biggest scalp so far — nobody in the room called it.`
        : `${winner} beat ${loser} [${seed}] — only ${sawIt} of ${nUsers} had it.`,
      weight: sawIt === 0 ? 95 : 80,
      at,
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
        weight: 55, at: m.scheduled_start,
      })
    } else if (minority === 1) {
      const oddSide = p1 < p2 ? 'player1' : 'player2'
      const odd = on.find(t => t.predicted_winner === oddSide)
      const who = odd ? nameById.get(odd.user_id) : null
      if (who) {
        facts.push({
          text: `${who} is the only one on ${sideName(m, oddSide)} — the other ${on.length - 1} took ${sideName(m, oddSide === 'player1' ? 'player2' : 'player1')}.`,
          weight: 90, at: m.scheduled_start,
        })
      }
    } else if (Math.abs(p1 - p2) <= 1) {
      facts.push({
        text: `Nothing splits the room like ${strip(m.player1_name)} v ${strip(m.player2_name)} — ${Math.max(p1, p2)}–${minority}.`,
        weight: 70, at: m.scheduled_start,
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
      weight: 88, at: m.scheduled_start,
    })
    break
  }

  // ── One the whole room got wrong ─────────────────────────────────────
  for (const m of recent) {
    if (bestUpset && m.id === bestUpset.id) continue      // already the headline
    const on = tips.filter(t => t.match_id === m.id)
    if (on.length < Math.max(4, Math.floor(nUsers * 0.6))) continue
    if (on.some(t => t.predicted_winner === m.winner)) continue
    facts.push({
      text: `Not one of us had ${sideName(m, m.winner!)} over ${sideName(m, m.winner === 'player1' ? 'player2' : 'player1')}.`,
      weight: 86, at: m.scheduled_start,
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
  const standing = users.map(u => ({ name: u.display_name, pts: pts.get(u.id) ?? 0 }))
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
  const ranked = standing.map(s => s.pts)
  if (ranked.length >= 4 && ranked[0] > 0) {
    const spread = ranked[0] - ranked[ranked.length - 1]
    const topFive = ranked[0] - ranked[Math.min(4, ranked.length - 1)]
    if (spread <= 40) facts.push({ text: `Just ${spread} points covers the entire table.`, weight: 75 })
    else if (topFive <= 12) facts.push({ text: `The top five are within ${topFive} points of each other.`, weight: 65 })
  }

  // ── The lead ─────────────────────────────────────────────────────────
  if (standing.length >= 2 && standing[0].pts > 0) {
    const [first, second] = standing
    const tiedTop = standing.filter(s => s.pts === first.pts)
    if (tiedTop.length > 1) {
      facts.push({ text: `${tiedTop.length} tippers are locked together at the top on ${first.pts}.`, weight: 72 })
    } else {
      const gap = first.pts - second.pts
      facts.push({
        text: gap <= 8
          ? `${first.name} leads by ${gap} — less than one correct pick.`
          : `${first.name} leads ${second.name} by ${gap} points.`,
        weight: gap <= 8 ? 78 : 50,
      })
    }
  }

  // ── Best haul in the last completed round ────────────────────────────
  if (lastDone) {
    const rm = matches.filter(m => m.round_id === lastDone.id && m.winner && !m.no_points)
    const hauls = users.map(u => ({
      name: u.display_name,
      got: tips.filter(t => t.user_id === u.id
        && rm.some(m => m.id === t.match_id && m.winner === t.predicted_winner)).length,
    })).sort((a, b) => b.got - a.got || a.name.localeCompare(b.name))
    const best = hauls[0]
    const sharing = best ? hauls.filter(h => h.got === best.got).length : 0
    if (best && best.got > 0) {
      const round = ROUND_LONG[lastDone.name] ?? lastDone.name
      const worth = `${best.got} from ${rm.length}, worth ${best.got * lastDone.points_per_correct_tip} points`
      facts.push({
        text: sharing === 1
          ? `${best.name} took the most out of the ${round} — ${worth}.`
          : `${sharing} of us tied for the best ${round} — ${worth}.`,
        weight: 68,
      })
    }
  }

  // ── Who is left in the draw ──────────────────────────────────────────
  const alive = new Set<string>()
  const beaten = new Set<string>()
  for (const m of matches) {
    if (!m.winner) continue
    alive.add(strip(m.winner === 'player1' ? m.player1_name : m.player2_name))
    beaten.add(strip(m.winner === 'player1' ? m.player2_name : m.player1_name))
  }
  for (const n of beaten) alive.delete(n)
  const seedsAlive = [...alive].filter(n => matches.some(m =>
    (strip(m.player1_name) === n && seedOf(m.player1_name) !== null) ||
    (strip(m.player2_name) === n && seedOf(m.player2_name) !== null))).length
  if (alive.size > 1 && alive.size <= 32) {
    facts.push({
      text: `${alive.size} players left, ${seedsAlive} of them seeded.`,
      weight: 45,
    })
  }

  // ── Choose the three to show ─────────────────────────────────────────
  // Weight sets a fact's standing; age pulls it back down, and a seed that
  // turns over at AEST midnight settles the order among facts of similar
  // standing. So the box moves on each day even when no new result has landed.
  const dayKey = now.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
  const DAY_MS = 86_400_000

  const ordered = facts
    .map(f => {
      const ageDays = f.at ? Math.max(0, (now.getTime() - new Date(f.at).getTime()) / DAY_MS) : 0
      const decay = Math.min(f.weight * MAX_DECAY, ageDays * DECAY_PER_DAY)
      return { text: f.text, score: f.weight - decay + hash01(f.text + dayKey) * DAILY_SPREAD }
    })
    .sort((a, b) => b.score - a.score)

  if (ordered.length <= 3) return ordered.map(f => f.text)

  // The strongest note always shows, so a big result the room missed appears
  // the day it happens. The other two slots walk through the rest of the pool
  // a step per day, which is what stops the box reading the same all week.
  // The remaining pool is walked in a fixed order rather than by score: scores
  // shift a little each day as facts age, and indexing into a moving list can
  // land on the same note two days running, which is the staleness this is
  // meant to fix. A stable order guarantees the step actually advances.
  const dayIndex = Math.floor(Date.parse(dayKey) / DAY_MS)
  const rest = ordered.slice(1).sort((a, b) => a.text.localeCompare(b.text))
  return [
    ordered[0].text,
    rest[dayIndex % rest.length].text,
    rest[(dayIndex + 1) % rest.length].text,
  ]
}
