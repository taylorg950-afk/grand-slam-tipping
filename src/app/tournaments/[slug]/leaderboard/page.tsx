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
  const a = 0.08 + (v / max) * 0.22
  return `rgba(184, 84, 51, ${a.toFixed(2)})`
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

    const gained: Record<string, number> = {}
    for (const u of users) {
      const userTips = tips.filter(t => t.user_id === u.id && resultedMatches.some(m => m.id === t.match_id))
      const correct = userTips.filter(t => {
        const match = resultedMatches.find(m => m.id === t.match_id)!
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
      const roundMatches = matches.filter(m => m.round_id === round.id && m.winner)
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

  // Stuck: longest run of identical rank ending at latest. Compute per user.
  const stuckRunPerUser = users.map(u => {
    let run = 0
    for (let i = snapshots.length - 1; i > 0; i--) {
      if (snapshots[i].ranks[u.id] === snapshots[i - 1].ranks[u.id]) run++
      else break
    }
    return { user: u, run }
  })
  const stuckEntry = [...stuckRunPerUser]
    .sort((a, b) => b.run - a.run)[0]

  // Build narrative signals for the latest round per chosen user
  const latestResultedRound = latest.round
  const latestRoundName = ROUND_LONG[latestResultedRound.name] ?? latestResultedRound.name

  function buildSignals(userId: string): MoverSignals {
    const roundMatchesAll = matches.filter(m => m.round_id === latestResultedRound.id)
    const resulted = roundMatchesAll.filter(m => m.winner)
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

  const stuck: MoverPanel | null = stuckEntry && stuckEntry.run > 0
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
  const rounds: Round[] = roundData ?? []
  const orderedRounds = [...rounds].sort((a, b) => a.sort_order - b.sort_order)
  const roundIds = orderedRounds.map(r => r.id)

  const [{ data: matchData }, { data: users }] = await Promise.all([
    supabase.from('matches').select('id, round_id, winner, scheduled_start').in('round_id', roundIds),
    supabase.from('users').select('id, display_name').order('display_name'),
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
  const moversSinceLabel = movers.baselineRoundName ? `Since ${movers.baselineRoundName}` : null
  const cityGhost = cityFor(tournament.slug)

  return (
    <main className="relative flex min-h-screen flex-col">
      <div aria-hidden className="tp-paper-grain" />

      {/* Compact masthead */}
      <header className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule)] px-4 py-3 md:px-8">
        <Link href="/dashboard" className="font-serif italic text-[20px] leading-none tracking-tight md:text-[26px]">
          The Tipping Post
        </Link>
        <div className="tp-eyebrow flex items-center gap-5">
          <span className="hidden md:inline">{tournament.name}</span>
          <Link href="/profile" className="hover:text-[var(--ink)]">Profile</Link>
        </div>
      </header>

      {/* Clay banner */}
      <section className="relative z-10 overflow-hidden bg-[var(--brick)] px-4 py-5 text-[var(--paper)] md:px-8 md:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-3 -right-6 select-none whitespace-nowrap font-serif italic text-white/[0.07] md:-top-4 md:-right-8"
          style={{ fontSize: 'clamp(110px, 24vw, 220px)', lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          {cityGhost}
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] opacity-85 md:text-[10px]">
          The Standings · {tournament.name}
        </div>
        <h1 className="mt-1 font-serif text-[30px] leading-[1.04] tracking-tight md:text-[48px] md:mt-2">
          Full table, <span className="italic">{headlineKicker.toLowerCase()}</span>
        </h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] text-white/90 md:gap-x-5 md:text-[13px]">
          <span><b className="font-semibold text-white">{resultedMatchCount}</b> matches resulted</span>
          <span className="size-[3px] rounded-full bg-white/40" />
          <span>{rows.length} tippers in</span>
          {myRank > 0 && (
            <>
              <span className="size-[3px] rounded-full bg-white/40" />
              <span>You&apos;re <b className="font-semibold text-white">{myRank}{ordinalSuffix(myRank)}</b> of {rows.length}</span>
            </>
          )}
        </div>
      </section>

      {/* Leaderboard — table on lg+, card list below */}
      <section className="relative z-10 px-4 pb-2 pt-6 md:px-8">
        <div className="flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
          <h2 className="m-0 font-serif text-[20px] tracking-tight md:text-[22px]">The leaderboard</h2>
          <span className="tp-eyebrow">{moversSinceLabel ?? 'Live'}</span>
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center font-serif italic text-[var(--ink-2)]">
            No tippers yet.
          </div>
        ) : (
          <>
            {/* ── Desktop table ───────────────────────────────── */}
            <div className="hidden lg:block">
              <div
                className="grid items-baseline gap-2 px-2 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--ink-2)]"
                style={{ gridTemplateColumns: tableGridCols(orderedRounds.length) }}
              >
                <span>#</span>
                <span></span>
                <span>Tipper</span>
                <span className="text-center">Move</span>
                {orderedRounds.map(r => (
                  <span key={r.id} className="text-center">
                    {r.name}
                    <div className="mt-0.5 font-serif text-[9px] italic normal-case tracking-normal text-[var(--ink-3)]">
                      {r.points_per_correct_tip}pt
                    </div>
                  </span>
                ))}
                <span className="text-right">Hits</span>
                <span className="text-right">%</span>
                <span className="text-right">Run</span>
                <span className="text-right">Points</span>
              </div>

              {rows.map((row, i) => {
                const isMe = row.userId === user.id
                const isLast = i === rows.length - 1
                const accuracy = row.tipped > 0 ? Math.round((row.correct / row.tipped) * 100) : 0
                return (
                  <div
                    key={row.userId}
                    className={`grid items-center gap-2 px-2 py-3.5 ${
                      isLast ? '' : 'border-b border-dotted border-[var(--rule)]'
                    }`}
                    style={{
                      gridTemplateColumns: tableGridCols(orderedRounds.length),
                      background: isMe ? 'rgba(184,84,51,0.04)' : 'transparent',
                    }}
                  >
                    <div
                      className="font-serif italic text-[22px] leading-none"
                      style={{ color: isMe ? 'var(--brick)' : i === 0 ? 'var(--brick)' : 'var(--ink-2)' }}
                    >
                      {i + 1}
                    </div>
                    <Avatar name={row.display_name} size={26} />
                    <div
                      className="min-w-0 truncate text-[15px] leading-[1.2]"
                      style={{
                        fontWeight: isMe ? 500 : 400,
                        color: isMe ? 'var(--brick)' : 'var(--ink)',
                      }}
                    >
                      {row.display_name}
                      {isMe && <span className="ml-1.5 italic font-normal text-[var(--ink-2)]">· you</span>}
                    </div>
                    <div className="text-center">
                      <MoveIndicator move={row.move} />
                    </div>
                    {orderedRounds.map(r => {
                      const v = row.perRound[r.id] ?? 0
                      return (
                        <div
                          key={r.id}
                          className="text-center font-serif text-[17px] leading-none tabular-nums"
                          style={{
                            padding: '8px 0',
                            background: heatBg(v, maxByRound[r.id] ?? 0),
                            color: v === 0 ? 'var(--ink-4)' : 'var(--ink)',
                          }}
                        >
                          {v === 0 ? '—' : v}
                        </div>
                      )
                    })}
                    <div className="text-right tabular-nums text-[13px] text-[var(--ink-2)]">
                      {row.correct}/{row.tipped}
                    </div>
                    <div className="text-right tabular-nums text-[13px] text-[var(--ink-3)]">
                      {row.tipped > 0 ? `${accuracy}%` : '—'}
                    </div>
                    <div className="flex justify-end">
                      <Sparkline data={row.spark} color={isMe ? '#3D4F2B' : '#3C342C'} width={56} height={22} />
                    </div>
                    <div
                      className="text-right font-serif leading-none tabular-nums text-[26px]"
                      style={{ color: isMe ? 'var(--brick)' : 'var(--ink)' }}
                    >
                      {row.total}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Card list (small + medium) ──────────────────── */}
            <div className="lg:hidden">
              {rows.map((row, i) => {
                const isMe = row.userId === user.id
                const accuracy = row.tipped > 0 ? Math.round((row.correct / row.tipped) * 100) : 0
                return (
                  <div
                    key={row.userId}
                    className="mt-2 p-3"
                    style={{
                      border: `1px solid ${isMe ? 'var(--brick)' : 'var(--rule)'}`,
                      background: isMe ? 'rgba(184,84,51,0.04)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 font-serif italic text-[22px] leading-none"
                        style={{ color: isMe ? 'var(--brick)' : i === 0 ? 'var(--brick)' : 'var(--ink-2)' }}
                      >
                        {i + 1}
                      </div>
                      <Avatar name={row.display_name} size={24} />
                      <div
                        className="min-w-0 flex-1 truncate text-[15px] leading-[1.2]"
                        style={{
                          fontWeight: isMe ? 500 : 400,
                          color: isMe ? 'var(--brick)' : 'var(--ink)',
                        }}
                      >
                        {row.display_name}
                        {isMe && <span className="ml-1 italic font-normal text-[var(--ink-2)]">· you</span>}
                      </div>
                      <MoveIndicator move={row.move} />
                      <div
                        className="min-w-[50px] text-right font-serif leading-none tabular-nums text-[26px]"
                        style={{ color: isMe ? 'var(--brick)' : 'var(--ink)' }}
                      >
                        {row.total}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-6 gap-0.5">
                      {orderedRounds.slice(0, 6).map(r => {
                        const v = row.perRound[r.id] ?? 0
                        return (
                          <div
                            key={r.id}
                            className="text-center py-1"
                            style={{
                              background: heatBg(v, maxByRound[r.id] ?? 0),
                              border: v === 0 ? '1px solid var(--rule-soft)' : '1px solid transparent',
                            }}
                          >
                            <div className="text-[8px] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)]">{r.name}</div>
                            <div
                              className="mt-0.5 font-serif text-[14px] leading-none tabular-nums"
                              style={{ color: v === 0 ? 'var(--ink-4)' : 'var(--ink)' }}
                            >
                              {v || '—'}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-2 flex justify-between text-[11px] tabular-nums text-[var(--ink-3)]">
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

      {/* Movers + Round detail */}
      {(movers.gainer || movers.faller || movers.stuck || orderedRounds.length > 0) && (
        <section className="relative z-10 grid grid-cols-1 gap-9 px-4 pb-8 pt-5 md:grid-cols-[7fr_5fr] md:px-8">
          {/* Movers */}
          <div>
            <div className="mb-3 flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
              <h2 className="m-0 font-serif text-[20px] tracking-tight md:text-[22px]">
                Movers {movers.baselineRoundName ? `since ${movers.baselineRoundName}` : ''}
              </h2>
              <span className="tp-eyebrow">biggest swings</span>
            </div>
            {!movers.gainer && !movers.faller && !movers.stuck ? (
              <div className="py-4 font-serif italic text-[var(--ink-2)]">
                Movers panel kicks in after the second resulted round.
              </div>
            ) : (
              <div>
                {movers.gainer && <MoverRow panel={movers.gainer} kind="gainer" />}
                {movers.faller && <MoverRow panel={movers.faller} kind="faller" />}
                {movers.stuck && <MoverRow panel={movers.stuck} kind="stuck" isLast />}
              </div>
            )}
          </div>

          {/* Round detail */}
          {orderedRounds.length > 0 && (
            <div>
              <div className="mb-3 flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
                <h2 className="m-0 font-serif text-[20px] tracking-tight md:text-[22px]">Round detail</h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {orderedRounds.map(r => (
                  <Link
                    key={r.id}
                    href={`/tournaments/${slug}/round/${r.name}`}
                    className="min-w-[110px] border border-[var(--rule)] px-4 py-3 transition-colors hover:border-[var(--ink)]"
                  >
                    <div className="tp-eyebrow">{r.name}</div>
                    <div className="mt-1 font-serif italic text-[11px] text-[var(--ink-3)]">{r.points_per_correct_tip}pt each</div>
                    <div className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--brick)]">Open →</div>
                  </Link>
                ))}
              </div>
              <div className="tp-pull mt-5">
                Round views show every tipper&apos;s pick on every match — visible only after each match locks.{' '}
                <span className="tp-pull__punch">No peeking before then.</span>
              </div>
            </div>
          )}
        </section>
      )}

      <TabBar tournamentSlug={slug} />
    </main>
  )
}

function tableGridCols(numRounds: number) {
  // 32 # · 28 avatar · 1.6fr tipper · 50 move · numRounds × 60 · 70 hits · 56 % · 60 run · 70 points
  return `32px 28px 1.6fr 50px repeat(${numRounds}, 60px) 70px 56px 60px 70px`
}

// ─── Small primitives ─────────────────────────────────────────────

function Avatar({ name, size }: { name: string; size: number }) {
  const initial = name[0]?.toUpperCase() ?? '?'
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--brick-dark)] text-[var(--paper)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), fontWeight: 500 }}
    >
      {initial}
    </div>
  )
}

function MoveIndicator({ move }: { move: number }) {
  if (move === 0) {
    return <span className="text-[11px] text-[var(--ink-4)]">—</span>
  }
  const up = move > 0
  return (
    <span
      className="text-[11px] font-medium tabular-nums"
      style={{ color: up ? 'var(--olive)' : 'var(--brick)' }}
    >
      {up ? '▲' : '▼'} {Math.abs(move)}
    </span>
  )
}

function Sparkline({ data, color, width, height }: { data: number[]; color: string; width: number; height: number }) {
  if (data.length < 2) return <span className="text-[11px] text-[var(--ink-4)]">—</span>
  const max = Math.max(...data, 1)
  const stepX = width / (data.length - 1)
  const pts = data.map((v, i) => {
    const x = i * stepX
    const y = height - (v / max) * (height - 2) - 1
    return [x, y] as const
  })
  const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
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
    color = 'var(--brick)'
  } else {
    movePhrase = `± 0 spots · stuck for ${panel.stuckRounds} ${pluralRounds(panel.stuckRounds ?? 0)}`
    color = 'var(--ink-2)'
  }
  return (
    <div className={`py-3.5 ${isLast ? '' : 'border-b border-dotted border-[var(--rule)]'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-serif text-[18px] leading-[1.2] md:text-[19px]">{panel.name}</div>
        <div className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color }}>
          {movePhrase}
        </div>
      </div>
      {panel.narrative && panel.narrative !== '—' && (
        <div className="mt-1.5 font-serif italic text-[13px] leading-[1.3] text-[var(--ink-2)]">
          {panel.narrative}
        </div>
      )}
    </div>
  )
}
