import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/TabBar'
import {
  gainerNarrative,
  fallerNarrative,
  stuckNarrative,
  pluralSpots,
  pluralRounds,
  MoverSignals,
} from '@/lib/copy/standings-movers'
import { fetchTipsForMatches } from '@/lib/tips'

interface Round {
  id: string
  name: string
  points_per_correct_tip: number
  sort_order: number
}
interface Match {
  id: string
  round_id: string
  winner: string | null
  no_points: boolean
  scheduled_start: string
}
interface Tip {
  user_id: string
  match_id: string
  predicted_winner: string
}
interface UserRow {
  id: string
  display_name: string
  avatar_url?: string | null
}

const ROUND_LONG: Record<string, string> = {
  R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
}

const TOURNAMENT_CITY: Record<string, string> = {
  'australian-open': 'MELBOURNE',
  'roland-garros': 'PARIS',
  'french-open': 'PARIS',
  'italian-open': 'ROMA',
  'madrid-open': 'MADRID',
  'wimbledon': 'LONDON',
  'us-open': 'NEW YORK',
  'miami-open': 'MIAMI',
  'indian-wells': 'INDIAN WELLS',
}

function cityFor(slug: string): string {
  for (const key of Object.keys(TOURNAMENT_CITY)) {
    if (slug.includes(key)) return TOURNAMENT_CITY[key]
  }
  return slug.split('-')[0]?.toUpperCase() ?? 'TIPPING POST'
}

function ordinalSuffix(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

function heatBg(v: number, max: number) {
  if (v === 0 || max === 0) return 'transparent'
  const a = 0.1 + (v / max) * 0.32
  return `rgba(28,122,75, ${a.toFixed(2)})`
}

const AVATAR_COLORS = [
  '#1B4DD8', '#6C5CE7', '#C58A2E', '#C24B2C', '#1F9E8A',
  '#D6497E', '#00643C', '#B08A3E', '#4A8C6A', '#8E6BB0',
]

function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0]?.toUpperCase() || '?'
}

// ─── Round-by-round snapshot ────────────────────────────────────────
//
// For each ordered round with at least one resulted match, accumulate
// per-user points and compute the ranking as of the end of that round.
// `points[u]` is cumulative through this round. `gained[u]` is what
// they earned in this round alone.

interface Snapshot {
  round: Round
  fullyResulted: boolean
  points: Record<string, number>
  gained: Record<string, number>
  ranks: Record<string, number>
}

function computeSnapshots(users: UserRow[], rounds: Round[], matches: Match[], tips: Tip[]): Snapshot[] {
  const orderedRounds = [...rounds].sort((a, b) => a.sort_order - b.sort_order)
  const running: Record<string, number> = {}
  users.forEach(u => { running[u.id] = 0 })

  const snapshots: Snapshot[] = []
  for (const round of orderedRounds) {
    const roundMatches = matches.filter(m => m.round_id === round.id)
    const resultedMatches = roundMatches.filter(m => m.winner)
    if (resultedMatches.length === 0) continue

    // Walkovers etc. still count as resulted, but never award points.
    const scoringMatches = resultedMatches.filter(m => !m.no_points)
    const gained: Record<string, number> = {}
    for (const u of users) {
      const userTips = tips.filter(t => t.user_id === u.id && scoringMatches.some(m => m.id === t.match_id))
      const correct = userTips.filter(t => {
        const match = scoringMatches.find(m => m.id === t.match_id)!
        return match.winner === t.predicted_winner
      }).length
      const pts = correct * round.points_per_correct_tip
      gained[u.id] = pts
      running[u.id] = (running[u.id] ?? 0) + pts
    }

    // Rank by cumulative points (ties share rank but we use index+1 — close
    // enough for v1; ties broken stably by display_name).
    const sortedIds = [...users].sort((a, b) => {
      const diff = (running[b.id] ?? 0) - (running[a.id] ?? 0)
      return diff !== 0 ? diff : a.display_name.localeCompare(b.display_name)
    }).map(u => u.id)
    const ranks: Record<string, number> = {}
    sortedIds.forEach((id, i) => { ranks[id] = i + 1 })

    snapshots.push({
      round,
      fullyResulted: resultedMatches.length === roundMatches.length && roundMatches.length > 0,
      points: { ...running },
      gained,
      ranks,
    })
  }
  return snapshots
}

// ─── Per-user per-round points (for the table cells) ─────────────────

interface RoundPointsRow {
  userId: string
  display_name: string
  avatar_url: string | null
  total: number
  tipped: number
  correct: number
  perRound: Record<string, number>  // by round.id
  spark: number[]                   // cumulative points per ordered round
  move: number                      // baselineRank - currentRank (positive = up)
}

function computeRows(users: UserRow[], rounds: Round[], matches: Match[], tips: Tip[]): RoundPointsRow[] {
  const orderedRounds = [...rounds].sort((a, b) => a.sort_order - b.sort_order)
  return users.map(u => {
    const userTips = tips.filter(t => t.user_id === u.id)
    const perRound: Record<string, number> = {}
    const spark: number[] = [0]
    let running = 0
    let correct = 0

    for (const round of orderedRounds) {
      const roundMatches = matches.filter(m => m.round_id === round.id && m.winner && !m.no_points)
      const myTips = userTips.filter(t => roundMatches.some(m => m.id === t.match_id))
      const c = myTips.filter(t => {
        const match = roundMatches.find(m => m.id === t.match_id)!
        return match.winner === t.predicted_winner
      }).length
      const pts = c * round.points_per_correct_tip
      perRound[round.id] = pts
      correct += c
      running += pts
      spark.push(running)
    }
    return {
      userId: u.id,
      display_name: u.display_name,
      avatar_url: u.avatar_url ?? null,
      total: running,
      tipped: userTips.length,
      correct,
      perRound,
      spark,
      move: 0,
    }
  })
}

// ─── Movers ─────────────────────────────────────────────────────────

function consensusPicks(matchId: string, tips: Tip[]): 'player1' | 'player2' | null {
  const ts = tips.filter(t => t.match_id === matchId)
  if (ts.length === 0) return null
  const p1 = ts.filter(t => t.predicted_winner === 'player1').length
  return p1 >= ts.length - p1 ? 'player1' : 'player2'
}

interface MoversResult {
  baselineRoundName: string | null
  gainer: MoverPanel | null
  faller: MoverPanel | null
  stuck: MoverPanel | null
}

interface MoverPanel {
  name: string
  spotsDelta: number
  pointsDelta: number
  narrative: string
  stuckRounds?: number
}

function computeMovers(
  snapshots: Snapshot[],
  users: UserRow[],
  rounds: Round[],
  matches: Match[],
  tips: Tip[],
): MoversResult {
  if (snapshots.length < 2) {
    return { baselineRoundName: null, gainer: null, faller: null, stuck: null }
  }

  const latest = snapshots[snapshots.length - 1]
  const baseline = snapshots[snapshots.length - 2]

  // Compute spots delta + points delta per user
  const swings = users.map(u => {
    const spotsDelta = (baseline.ranks[u.id] ?? users.length) - (latest.ranks[u.id] ?? users.length)
    const pointsDelta = (latest.points[u.id] ?? 0) - (baseline.points[u.id] ?? 0)
    return { user: u, spotsDelta, pointsDelta }
  })

  // Top gainer: largest positive spotsDelta, tie-break by pointsDelta
  const gainerSwing = [...swings]
    .filter(s => s.spotsDelta > 0)
    .sort((a, b) => b.spotsDelta - a.spotsDelta || b.pointsDelta - a.pointsDelta)[0]

  // Top faller: largest negative spotsDelta
  const fallerSwing = [...swings]
    .filter(s => s.spotsDelta < 0)
    .sort((a, b) => a.spotsDelta - b.spotsDelta || a.pointsDelta - b.pointsDelta)[0]

  // Stuck: longest run of identical rank ending at latest. Only counts someone
  // actually playing — a tipper who has never filed sits frozen at the bottom
  // forever, and billing that as the room's biggest swing is nonsense.
  const hasTipped = new Set(tips.map(t => t.user_id))
  const stuckRunPerUser = users.map(u => {
    let run = 0
    for (let i = snapshots.length - 1; i > 0; i--) {
      if (snapshots[i].ranks[u.id] === snapshots[i - 1].ranks[u.id]) run++
      else break
    }
    return { user: u, run }
  })
  const stuckEntry = [...stuckRunPerUser]
    .filter(s => hasTipped.has(s.user.id))
    .sort((a, b) => b.run - a.run)[0]

  // Build narrative signals for the latest round per chosen user
  const latestResultedRound = latest.round
  const latestRoundName = ROUND_LONG[latestResultedRound.name] ?? latestResultedRound.name

  function buildSignals(userId: string): MoverSignals {
    const roundMatchesAll = matches.filter(m => m.round_id === latestResultedRound.id)
    const resulted = roundMatchesAll.filter(m => m.winner && !m.no_points)
    if (resulted.length === 0) {
      return {
        consecutiveCorrectInLatestRound: 0,
        thisRoundAccuracy: null,
        roomAvgAccuracy: null,
        zeroLatestRound: false,
        latestRoundName,
        pickedAllConsensus: false,
        stuckRounds: 0,
      }
    }
    const userTips = tips.filter(t => t.user_id === userId)
    const sortedResulted = [...resulted].sort((a, b) =>
      new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
    )
    let consecutive = 0
    let max = 0
    let totalCorrect = 0
    let totalTipped = 0
    let allConsensus = true
    for (const m of sortedResulted) {
      const t = userTips.find(x => x.match_id === m.id)
      if (!t) {
        consecutive = 0
        continue
      }
      totalTipped++
      const ok = t.predicted_winner === m.winner
      if (ok) {
        totalCorrect++
        consecutive++
        if (consecutive > max) max = consecutive
      } else {
        consecutive = 0
      }
      const cons = consensusPicks(m.id, tips)
      if (cons !== t.predicted_winner) allConsensus = false
    }

    const roomTipsForRound = tips.filter(t => resulted.some(m => m.id === t.match_id))
    const roomCorrect = roomTipsForRound.filter(t => {
      const match = resulted.find(m => m.id === t.match_id)!
      return match.winner === t.predicted_winner
    }).length
    const roomAvg = roomTipsForRound.length > 0 ? Math.round((roomCorrect / roomTipsForRound.length) * 100) : null
    const thisRoundAccuracy = totalTipped > 0 ? Math.round((totalCorrect / totalTipped) * 100) : null

    const stuckRun = stuckRunPerUser.find(s => s.user.id === userId)?.run ?? 0

    return {
      consecutiveCorrectInLatestRound: max,
      thisRoundAccuracy,
      roomAvgAccuracy: roomAvg,
      zeroLatestRound: totalTipped > 0 && totalCorrect === 0,
      latestRoundName,
      pickedAllConsensus: totalTipped > 0 && allConsensus,
      stuckRounds: stuckRun,
    }
  }

  const gainer: MoverPanel | null = gainerSwing
    ? {
        name: gainerSwing.user.display_name,
        spotsDelta: gainerSwing.spotsDelta,
        pointsDelta: gainerSwing.pointsDelta,
        narrative: gainerNarrative(buildSignals(gainerSwing.user.id)),
      }
    : null

  const faller: MoverPanel | null = fallerSwing
    ? {
        name: fallerSwing.user.display_name,
        spotsDelta: fallerSwing.spotsDelta,
        pointsDelta: fallerSwing.pointsDelta,
        narrative: fallerNarrative(buildSignals(fallerSwing.user.id)),
      }
    : null

  const stuck: MoverPanel | null = stuckEntry && stuckEntry.run >= 2
    ? {
        name: stuckEntry.user.display_name,
        spotsDelta: 0,
        pointsDelta: 0,
        narrative: stuckNarrative(buildSignals(stuckEntry.user.id)),
        stuckRounds: stuckEntry.run,
      }
    : null

  return {
    baselineRoundName: baseline.round.name,
    gainer,
    faller,
    stuck,
  }
}

// ─── Page ───────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  if (!tournament) notFound()

  const { data: roundData } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .order('sort_order')
  // A round worth 0 points is in the draw but not tipped, so it has no column
  // in the table and no bearing on movers or snapshots — it would only ever be
  // a strip of dashes.
  const rounds: Round[] = (roundData ?? []).filter(r => r.points_per_correct_tip > 0)
  const orderedRounds = [...rounds].sort((a, b) => a.sort_order - b.sort_order)
  const roundIds = orderedRounds.map(r => r.id)

  const [{ data: matchData }, { data: users }] = await Promise.all([
    supabase.from('matches').select('id, round_id, winner, no_points, scheduled_start').in('round_id', roundIds),
    supabase.from('users').select('id, display_name, avatar_url').order('display_name'),
  ])
  const matches: Match[] = matchData ?? []
  const userRows: UserRow[] = users ?? []
  const matchIds = matches.map(m => m.id)

  const tips: Tip[] = await fetchTipsForMatches(supabase, matchIds)

  const snapshots = computeSnapshots(userRows, orderedRounds, matches, tips)
  const rows = computeRows(userRows, orderedRounds, matches, tips)

  // Sort rows by total points (desc), stable by name
  rows.sort((a, b) => b.total - a.total || a.display_name.localeCompare(b.display_name))

  // Move column derived from snapshots
  const latestSnap = snapshots[snapshots.length - 1] ?? null
  const baselineSnap = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null
  for (const row of rows) {
    if (latestSnap && baselineSnap) {
      row.move = (baselineSnap.ranks[row.userId] ?? userRows.length) - (latestSnap.ranks[row.userId] ?? userRows.length)
    }
  }

  const resultedMatchCount = matches.filter(m => m.winner).length
  const myRank = rows.findIndex(r => r.userId === user.id) + 1

  // Heat-shading max per round (by round.id)
  const maxByRound: Record<string, number> = {}
  for (const round of orderedRounds) {
    maxByRound[round.id] = Math.max(0, ...rows.map(r => r.perRound[round.id] ?? 0))
  }

  // Latest in-progress round = first round (by sort order) that has matches
  // but isn't fully resulted
  const inProgress = orderedRounds.find(r => {
    const rm = matches.filter(m => m.round_id === r.id)
    return rm.length > 0 && rm.some(m => !m.winner)
  })
  const headlineRound = inProgress ?? orderedRounds[orderedRounds.length - 1] ?? null
  const headlineKicker = inProgress
    ? `Mid ${ROUND_LONG[inProgress.name] ?? inProgress.name}.`
    : (headlineRound ? `After ${ROUND_LONG[headlineRound.name] ?? headlineRound.name}.` : 'Full table.')

  const movers = computeMovers(snapshots, userRows, orderedRounds, matches, tips)
  const cityGhost = cityFor(tournament.slug)


  return (
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      {/* Masthead */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
          <span className="hidden rounded-full bg-[var(--brick-surface)] px-2.5 py-1 font-serif text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-[var(--brick)] sm:inline">
            {tournament.name}
          </span>
        </Link>
        <Link href="/profile" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)] hover:text-[var(--ink)]">
          Profile
        </Link>
      </header>

      {/* Hero */}
      <section className="uso-hero relative overflow-hidden px-5 py-7 text-white md:px-8 md:py-9">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-5 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
          style={{ fontSize: 'clamp(120px, 22vw, 180px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}
        >
          {cityGhost}
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            The standings · {tournament.name}
          </div>
          <h1 className="mt-2 font-serif text-[28px] font-bold leading-[1] md:text-[40px]">
            Full table, {headlineKicker.toLowerCase()}
          </h1>
          <div className="mt-3 text-[14px]" style={{ color: '#DDE6FA' }}>
            {resultedMatchCount} matches resulted · {rows.length} tippers in
            {myRank > 0 && <> · you&apos;re {myRank}{ordinalSuffix(myRank)} of {rows.length}</>}
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="px-5 pt-6 md:px-8">
        {rows.length === 0 ? (
          <div className="tp-card p-10 text-center text-[14px] text-[var(--ink-2)]">No tippers yet.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="tp-card tp-scroll hidden overflow-x-auto p-4 lg:block">
              <div style={{ minWidth: 680 }}>
                <div
                  className="grid items-end gap-2 border-b-2 border-[var(--ink)] px-1.5 pb-2.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-3)]"
                  style={{ gridTemplateColumns: tableGridCols(orderedRounds.length) }}
                >
                  <span className="text-center">#</span>
                  <span></span>
                  <span>Tipper</span>
                  {orderedRounds.map(r => (
                    <span key={r.id} className="text-center">
                      {r.name}
                      <div className="mt-0.5 font-medium normal-case tracking-normal text-[var(--ink-3)]">{r.points_per_correct_tip}pt</div>
                    </span>
                  ))}
                  <span className="text-right">Hits</span>
                  <span className="text-right">%</span>
                  <span className="text-right">Points</span>
                </div>

                {rows.map((row, i) => {
                  const isMe = row.userId === user.id
                  const accuracy = row.tipped > 0 ? Math.round((row.correct / row.tipped) * 100) : 0
                  return (
                    <div
                      key={row.userId}
                      className="grid items-center gap-2 rounded-[8px] px-1.5 py-2.5"
                      style={{ gridTemplateColumns: tableGridCols(orderedRounds.length), background: isMe ? 'var(--you-bg)' : 'transparent' }}
                    >
                      <span className="text-center font-serif text-[16px] font-semibold tabular-nums" style={{ color: isMe ? 'var(--brick)' : 'var(--ink-3)' }}>
                        {i + 1}
                      </span>
                      <Avatar name={row.display_name} avatarUrl={row.avatar_url} color={avatarColor(row.userId)} size={26} />
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[14px]" style={{ fontWeight: isMe ? 700 : 500, color: 'var(--ink)' }}>
                          {row.display_name}{isMe && <span className="font-medium text-[var(--ink-3)]"> · you</span>}
                        </span>
                        <MoveIndicator move={row.move} />
                      </span>
                      {orderedRounds.map(r => {
                        const v = row.perRound[r.id] ?? 0
                        return (
                          <span
                            key={r.id}
                            className="rounded-[8px] text-center font-serif text-[15px] tabular-nums"
                            style={{ padding: '7px 0', background: heatBg(v, maxByRound[r.id] ?? 0), color: v === 0 ? 'var(--ink-3)' : 'var(--ink)' }}
                          >
                            {v === 0 ? '—' : v}
                          </span>
                        )
                      })}
                      <span className="text-right text-[13px] tabular-nums text-[var(--ink-2)]">{row.correct}/{row.tipped}</span>
                      <span className="text-right text-[13px] tabular-nums text-[var(--ink-3)]">{row.tipped > 0 ? `${accuracy}%` : '—'}</span>
                      <span className="text-right font-serif text-[20px] font-bold tabular-nums" style={{ color: isMe ? 'var(--brick)' : 'var(--ink)' }}>{row.total}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile card list */}
            <div className="flex flex-col gap-3 lg:hidden">
              {rows.map((row, i) => {
                const isMe = row.userId === user.id
                const accuracy = row.tipped > 0 ? Math.round((row.correct / row.tipped) * 100) : 0
                return (
                  <div
                    key={row.userId}
                    className="tp-card p-4"
                    style={isMe ? { background: 'var(--you-bg)', boxShadow: 'inset 3px 0 0 var(--you-line)' } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center font-serif text-[17px] font-semibold tabular-nums" style={{ color: isMe ? 'var(--brick)' : 'var(--ink-3)' }}>{i + 1}</span>
                      <Avatar name={row.display_name} avatarUrl={row.avatar_url} color={avatarColor(row.userId)} size={30} />
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate text-[15px]" style={{ fontWeight: isMe ? 700 : 500, color: 'var(--ink)' }}>
                          {row.display_name}{isMe && <span className="font-medium text-[var(--ink-3)]"> · you</span>}
                        </span>
                        <MoveIndicator move={row.move} />
                      </span>
                      <span className="font-serif text-[22px] font-bold tabular-nums" style={{ color: isMe ? 'var(--brick)' : 'var(--ink)' }}>{row.total}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-6 gap-1.5">
                      {orderedRounds.slice(0, 6).map(r => {
                        const v = row.perRound[r.id] ?? 0
                        return (
                          <div key={r.id} className="rounded-[8px] py-1.5 text-center" style={{ background: heatBg(v, maxByRound[r.id] ?? 0) }}>
                            <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">{r.name}</div>
                            <div className="mt-0.5 font-serif text-[14px] font-semibold tabular-nums" style={{ color: v === 0 ? 'var(--ink-3)' : 'var(--ink)' }}>{v || '—'}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-3 flex justify-between text-[12px] tabular-nums text-[var(--ink-3)]">
                      <span>{row.correct}/{row.tipped} hits</span>
                      <span>{row.tipped > 0 ? `${accuracy}% accuracy` : '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Movers */}
      {(movers.gainer || movers.faller || movers.stuck) && (
        <section className="px-5 pb-8 pt-5 md:px-8">
          <div className="tp-card p-5 md:px-6">
            <div className="mb-1 flex items-center justify-between border-b border-[var(--rule)] pb-3">
              <h2 className="m-0 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">
                Movers {movers.baselineRoundName ? `since ${movers.baselineRoundName}` : ''}
              </h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">biggest swings</span>
            </div>
            {movers.gainer && <MoverRow panel={movers.gainer} kind="gainer" />}
            {movers.faller && <MoverRow panel={movers.faller} kind="faller" />}
            {movers.stuck && <MoverRow panel={movers.stuck} kind="stuck" isLast />}
          </div>
        </section>
      )}

      <TabBar tournamentSlug={slug} />
    </main>
  )
}

function tableGridCols(numRounds: number) {
  // # · avatar · tipper(+move) · rounds · hits · % · points
  return `30px 30px 1.5fr repeat(${numRounds}, 46px) 56px 44px 62px`
}

// ─── Small primitives ─────────────────────────────────────────────

function Avatar({ name, avatarUrl, color, size }: { name: string; avatarUrl?: string | null; color: string; size: number }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        style={{ width: size, height: size, flexShrink: 0, objectFit: 'cover', borderRadius: '9999px' }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: color }}
    >
      {initials(name)}
    </span>
  )
}

function MoveIndicator({ move }: { move: number }) {
  if (move === 0) return <span className="shrink-0 text-[11px] text-[var(--ink-3)]">—</span>
  const up = move > 0
  return (
    <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: up ? 'var(--olive)' : 'var(--down)' }}>
      {up ? '▲' : '▼'}{Math.abs(move)}
    </span>
  )
}

function MoverRow({ panel, kind, isLast }: { panel: MoverPanel; kind: 'gainer' | 'faller' | 'stuck'; isLast?: boolean }) {
  const spots = Math.abs(panel.spotsDelta)
  let movePhrase: string
  let color: string
  if (kind === 'gainer') {
    movePhrase = `+${spots} ${pluralSpots(spots)} · +${panel.pointsDelta} points`
    color = 'var(--olive)'
  } else if (kind === 'faller') {
    const ptsPhrase = panel.pointsDelta === 0 ? 'same points' : `${panel.pointsDelta > 0 ? '+' : ''}${panel.pointsDelta} points`
    movePhrase = `−${spots} ${pluralSpots(spots)} · ${ptsPhrase}`
    color = 'var(--down)'
  } else {
    movePhrase = `± 0 spots · stuck for ${panel.stuckRounds} ${pluralRounds(panel.stuckRounds ?? 0)}`
    color = 'var(--ink-3)'
  }
  return (
    <div className={`py-3.5 ${isLast ? '' : 'border-b border-[var(--rule)]'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[16px] font-semibold text-[var(--ink)]">{panel.name}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color }}>{movePhrase}</div>
      </div>
      {panel.narrative && panel.narrative !== '—' && (
        <div className="mt-1.5 text-[13px] leading-[1.4] text-[var(--ink-2)]">{panel.narrative}</div>
      )}
    </div>
  )
}
