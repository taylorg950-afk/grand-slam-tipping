import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeScores } from '@/lib/scoring'
import CumulativePointsChart, { CumulativePointsData } from '@/components/charts/CumulativePointsChart'
import { TabBar } from '@/components/TabBar'
import Link from 'next/link'
import { dashboardHeadline, HeadlineState } from '@/lib/copy/dashboard-headline'
import { dashboardBody, BodyState } from '@/lib/copy/dashboard-body'
import { AEST_TZ, AEST_LABEL } from '@/lib/time'
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
  player1_name: string
  player2_name: string
}

interface Tip {
  user_id: string
  match_id: string
  predicted_winner: string
}

interface RoundBreakdown {
  round: Round
  points: number
  correct: number
  tipped: number
  resulted: number
  total: number
  state: 'done' | 'live' | 'pending'
}

const ROUND_LONG: Record<string, string> = {
  R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
}

const TOURNAMENT_INFO: Record<string, { city: string; surface: string }> = {
  'australian-open': { city: 'Melbourne', surface: 'hard court' },
  'roland-garros': { city: 'Paris', surface: 'clay' },
  'french-open': { city: 'Paris', surface: 'clay' },
  'italian-open': { city: 'Rome', surface: 'clay' },
  'madrid-open': { city: 'Madrid', surface: 'clay' },
  'wimbledon': { city: 'London', surface: 'grass' },
  'us-open': { city: 'New York', surface: 'hard court' },
  'miami-open': { city: 'Miami', surface: 'hard court' },
  'indian-wells': { city: 'Indian Wells', surface: 'hard court' },
}

function tournamentMeta(slug: string | null | undefined, name: string): { city: string; surface: string } {
  if (slug) {
    for (const key of Object.keys(TOURNAMENT_INFO)) {
      if (slug.includes(key)) return TOURNAMENT_INFO[key]
    }
  }
  return { city: name.split(' ')[0] ?? 'the tournament', surface: 'court' }
}

function stripSeed(name: string) {
  return name.replace(/\s*\[.*?\]/, '').trim()
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return null
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtClock(date: Date) {
  return date.toLocaleTimeString('en-AU', { timeZone: AEST_TZ, hour: 'numeric', minute: '2-digit', hour12: false })
}

function fmtLockTime(date: Date) {
  return `${date.toLocaleString('en-AU', { timeZone: AEST_TZ, weekday: 'short', hour: 'numeric', hour12: true }).toLowerCase()} ${AEST_LABEL}`
}

function computeRoundBreakdown(
  userId: string,
  rounds: Round[],
  matches: Match[],
  tips: Tip[],
  now: Date,
): RoundBreakdown[] {
  return rounds.map(round => {
    const roundMatches = matches.filter(m => m.round_id === round.id)
    const resulted = roundMatches.filter(m => m.winner)
    const started = roundMatches.filter(m => new Date(m.scheduled_start) <= now)
    const myTips = tips.filter(t => t.user_id === userId && roundMatches.some(m => m.id === t.match_id))
    const correct = myTips.filter(t => {
      const match = resulted.find(m => m.id === t.match_id)
      return match && !match.no_points && t.predicted_winner === match.winner
    })

    let state: 'done' | 'live' | 'pending' = 'pending'
    if (roundMatches.length > 0 && resulted.length === roundMatches.length) state = 'done'
    else if (started.length > 0) state = 'live'

    return {
      round,
      points: correct.length * round.points_per_correct_tip,
      correct: correct.length,
      tipped: myTips.length,
      resulted: resulted.length,
      total: roundMatches.length,
      state,
    }
  })
}

const AVATAR_COLORS = [
  '#1B4DD8', '#6C5CE7', '#C58A2E', '#C24B2C', '#1F9E8A',
  '#D6497E', '#00643C', '#B08A3E', '#4A8C6A', '#8E6BB0',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0]?.toUpperCase() || '?'
}

// Cumulative points per tipper, round by round — the "progress over time" chart.
function buildChartData(
  users: Array<{ id: string; display_name: string }>,
  rounds: Round[],
  matches: Match[],
  tips: Tip[],
): CumulativePointsData[] {
  const names = users.map(u => u.display_name)
  const start: CumulativePointsData = { round: 'Start' }
  names.forEach(n => { start[n] = 0 })

  const rows: CumulativePointsData[] = [start]
  const running: Record<string, number> = {}
  names.forEach(n => { running[n] = 0 })

  for (const round of [...rounds].sort((a, b) => a.sort_order - b.sort_order)) {
    const roundMatches = matches.filter(m => m.round_id === round.id && m.winner && !m.no_points)
    if (roundMatches.length === 0) continue

    for (const user of users) {
      const myTips = tips.filter(t => t.user_id === user.id && roundMatches.some(m => m.id === t.match_id))
      const correct = myTips.filter(t => {
        const match = roundMatches.find(m => m.id === t.match_id)
        return match && t.predicted_winner === match.winner
      })
      running[user.display_name] = (running[user.display_name] ?? 0) + correct.length * round.points_per_correct_tip
    }

    const row: CumulativePointsData = { round: round.name }
    names.forEach(n => { row[n] = running[n] })
    rows.push(row)
  }

  return rows.length > 1 ? rows : []
}

function consensusOf(matchId: string, tips: Tip[]) {
  const ts = tips.filter(t => t.match_id === matchId)
  if (ts.length === 0) return null
  const p1 = ts.filter(t => t.predicted_winner === 'player1').length
  const p2 = ts.length - p1
  const side: 'player1' | 'player2' = p1 >= p2 ? 'player1' : 'player2'
  const pct = Math.round((Math.max(p1, p2) / ts.length) * 100)
  return { side, pct, total: ts.length, nonConsensus: Math.min(p1, p2) }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()

  const [{ data: profile }, { data: tournament }] = await Promise.all([
    supabase.from('users').select('display_name, is_admin').eq('id', user.id).single(),
    supabase.from('tournaments').select('id, name, slug, start_date').eq('is_active', true).maybeSingle(),
  ])

  const yourName = profile?.display_name?.split(/[.\s@]/)[0] ?? 'mate'

  // ─── Off-season state ───────────────────────────────────────────────
  if (!tournament) {
    const offHeadline = dashboardHeadline({
      hasActiveTournament: false,
      isFirstTimeUser: false,
      rank: null,
      numTippers: 0,
      gap: 0,
      leaderName: '',
      yourName,
      city: '',
      round: '',
      roundResultedCount: 0,
      tournamentComplete: false,
    })
    return (
      <main className="flex min-h-screen flex-col bg-[var(--paper)]">
        <Masthead tournamentName={null} isAdmin={profile?.is_admin ?? false} />
        <section className="mx-auto w-full max-w-3xl px-5 py-20 text-center md:px-8">
          <div className="tp-eyebrow mb-3">{offHeadline.kicker}</div>
          <h1 className="font-serif text-[40px] font-bold uppercase leading-[1.02] tracking-[0.01em] md:text-[56px]">
            {offHeadline.line1}
            <br />
            <span className="text-[var(--ink-2)]">{offHeadline.line2}</span>
          </h1>
        </section>
        <TabBar />
      </main>
    )
  }

  // ─── Active tournament — pull data ──────────────────────────────────
  const { data: roundData } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .order('sort_order')
  const rounds: Round[] = roundData ?? []

  const roundIds = rounds.map(r => r.id)
  const { data: matchData } = await supabase
    .from('matches')
    .select('id, round_id, winner, no_points, scheduled_start, player1_name, player2_name')
    .in('round_id', roundIds)
    .order('scheduled_start')
  const matches: Match[] = matchData ?? []
  const matchIds = matches.map(m => m.id)

  const [tips, { data: userRows }] = await Promise.all([
    fetchTipsForMatches(supabase, matchIds),
    supabase.from('users').select('id, display_name, avatar_url').order('display_name'),
  ])

  const users = (userRows ?? []).map(u => ({ id: u.id, display_name: u.display_name }))
  const avatarMap: Record<string, string | null> = Object.fromEntries(
    (userRows ?? []).map((u: { id: string; avatar_url?: string | null }) => [u.id, u.avatar_url ?? null])
  )
  const scores = computeScores(users, matches, rounds, tips)
  const myIndex = scores.findIndex(s => s.id === user.id)
  const myScore = myIndex !== -1 ? scores[myIndex] : null
  const myRank = myIndex !== -1 ? myIndex + 1 : null

  const orderedRounds = [...rounds].sort((a, b) => a.sort_order - b.sort_order)
  const roundBreakdown = computeRoundBreakdown(user.id, orderedRounds, matches, tips, now)
  const chartData = buildChartData(users, rounds, matches, tips)

  // Current round = first round with matches that isn't fully resulted
  const currentRound =
    orderedRounds.find(r => {
      const rm = matches.filter(m => m.round_id === r.id)
      return rm.length > 0 && rm.some(m => !m.winner)
    }) ?? orderedRounds.find(r => matches.some(m => m.round_id === r.id)) ?? orderedRounds[0] ?? null
  const currentRoundLong = currentRound ? (ROUND_LONG[currentRound.name] ?? currentRound.name) : 'Round'

  const currentRoundMatches = currentRound ? matches.filter(m => m.round_id === currentRound.id) : []
  const currentRoundResultedCount = currentRoundMatches.filter(m => m.winner).length
  const myCurrentRoundTips = tips.filter(
    t => t.user_id === user.id && currentRoundMatches.some(m => m.id === t.match_id)
  )
  const tipsInRound = myCurrentRoundTips.length
  const totalInRound = currentRoundMatches.length

  // Next lock = earliest unlocked unresulted match in the current round
  const nextLockMatch = currentRoundMatches
    .filter(m => !m.winner && new Date(m.scheduled_start) > now)
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())[0]
  const lockMs = nextLockMatch ? new Date(nextLockMatch.scheduled_start).getTime() - now.getTime() : 0
  const lockCountdown = fmtCountdown(lockMs)
  const firstLockClock = nextLockMatch ? fmtLockTime(new Date(nextLockMatch.scheduled_start)) : null

  // Banner status verb (per COPY-PATTERNS Banner status verb table)
  const totalMatchesCurrent = currentRoundMatches.length
  const statusVerb =
    currentRoundResultedCount === totalMatchesCurrent && totalMatchesCurrent > 0
      ? 'complete'
      : currentRoundResultedCount > 0
        ? 'underway'
        : currentRoundMatches.some(m => new Date(m.scheduled_start) <= now)
          ? 'in progress'
          : 'to come'

  const meta = tournamentMeta(tournament.slug, tournament.name)

  // ─── Headline state ─────────────────────────────────────────────────
  const second = scores[myRank === 1 ? 1 : 0]
  const leader = scores[0]
  const gap = myScore && second ? Math.abs(myScore.totalPoints - (myRank === 1 ? second.totalPoints : (leader?.totalPoints ?? 0))) : 0
  const numTippers = scores.length
  const tournamentComplete = orderedRounds.length > 0 &&
    matches.length > 0 &&
    orderedRounds.every(r => {
      const rm = matches.filter(m => m.round_id === r.id)
      return rm.length > 0 && rm.every(m => !!m.winner)
    })
  const isFirstTimeUser = (myScore?.totalTips ?? 0) === 0 && (tips.filter(t => t.user_id === user.id).length === 0)
  const numUnpickedMatches = currentRoundMatches.filter(
    m => new Date(m.scheduled_start) > now && !tips.some(t => t.user_id === user.id && t.match_id === m.id)
  ).length

  // Tied for first
  const tiedAtTop =
    myRank === 1 && leader && scores.filter(s => s.totalPoints === leader.totalPoints).length > 1
  const tiedOthers = tiedAtTop
    ? scores.filter(s => s.totalPoints === leader.totalPoints && s.id !== user.id).map(s => s.display_name)
    : []

  const headlineState: HeadlineState = {
    hasActiveTournament: true,
    isFirstTimeUser,
    rank: myRank,
    numTippers,
    gap,
    leaderName: leader?.display_name ?? 'the leader',
    yourName,
    city: meta.city,
    round: currentRoundLong,
    roundResultedCount: currentRoundResultedCount,
    tournamentComplete,
    tiedAtTop: !!tiedAtTop,
    tiedNames: tiedOthers,
    tiedPoints: leader?.totalPoints,
    finalPoints: tournamentComplete ? leader?.totalPoints : undefined,
    numUnpickedMatches,
    locksIn: lockCountdown ?? undefined,
  }
  const headline = dashboardHeadline(headlineState)

  // ─── Body state ─────────────────────────────────────────────────────
  const resultedRoundBreakdown = roundBreakdown.filter(r => r.resulted > 0)
  const r1 = resultedRoundBreakdown[0] ?? null
  const r2 = resultedRoundBreakdown[1] ?? null
  const currentRoundIdx = currentRound ? orderedRounds.findIndex(r => r.id === currentRound.id) : -1
  const nextRound = currentRoundIdx >= 0 ? orderedRounds[currentRoundIdx + 1] ?? null : null

  // Lead match = first locked (or pre-lock if none locked) currentRound match
  const leadMatch =
    currentRoundMatches.find(m => new Date(m.scheduled_start) <= now && !m.winner) ??
    currentRoundMatches.find(m => !m.winner) ??
    null
  const leadConsensus = leadMatch ? consensusOf(leadMatch.id, tips) : null
  const leadConsensusPlayer = leadMatch && leadConsensus
    ? (leadConsensus.side === 'player1' ? stripSeed(leadMatch.player1_name) : stripSeed(leadMatch.player2_name))
    : null

  const leaderScore = scores[0]
  const leaderAccuracy = leaderScore && leaderScore.totalTips > 0
    ? Math.round((leaderScore.correctTips / leaderScore.totalTips) * 100)
    : null
  const secondScore = scores[1]
  const secondAccuracy = secondScore && secondScore.totalTips > 0
    ? Math.round((secondScore.correctTips / secondScore.totalTips) * 100)
    : null
  const myAccuracy = myScore && myScore.totalTips > 0
    ? Math.round((myScore.correctTips / myScore.totalTips) * 100)
    : null

  const bodyState: BodyState = {
    hasActiveTournament: true,
    isFirstTimeUser,
    rank: myRank,
    numTippers,
    yourName,
    leaderName: leader?.display_name ?? 'The leader',
    secondName: secondScore?.display_name ?? null,
    points: myScore?.totalPoints ?? 0,
    leaderPts: leader?.totalPoints ?? 0,
    gap,
    leaderAccuracy,
    secondAccuracy,
    secondTipped: secondScore?.totalTips ?? 0,
    accuracy: myAccuracy,
    tipped: myScore?.totalTips ?? 0,
    city: meta.city,
    surface: meta.surface,
    round: currentRoundLong,
    roundResultedCount: currentRoundResultedCount,
    currentRoundMatchCount: currentRoundMatches.length,
    firstRoundName: r1 ? (ROUND_LONG[r1.round.name] ?? r1.round.name) : null,
    secondRoundName: r2 ? (ROUND_LONG[r2.round.name] ?? r2.round.name) : null,
    r1Correct: r1?.correct ?? null,
    r1Total: r1?.resulted ?? null,
    r2Correct: r2?.correct ?? null,
    r2Total: r2?.resulted ?? null,
    nextRound: nextRound ? (ROUND_LONG[nextRound.name] ?? nextRound.name) : null,
    nextRoundPts: nextRound?.points_per_correct_tip ?? null,
    leadMatchP1: leadMatch ? stripSeed(leadMatch.player1_name) : null,
    leadMatchP2: leadMatch ? stripSeed(leadMatch.player2_name) : null,
    consensus: leadConsensusPlayer,
    consensusPct: leadConsensus?.pct ?? null,
    nonConsensusCount: leadConsensus?.nonConsensus ?? null,
    leadMatchLockTime: leadMatch ? fmtLockTime(new Date(leadMatch.scheduled_start)) : null,
    firstLock: firstLockClock,
    nMatches: currentRoundMatches.length,
    nUnpicked: numUnpickedMatches,
    nAbove: myRank ? myRank - 1 : null,
    nRoundsLeft: orderedRounds.length - Math.max(0, currentRoundIdx),
  }
  const body = dashboardBody(bodyState)

  // ─── Order of play ──────────────────────────────────────────────────
  const orderOfPlay = currentRoundMatches
    .filter(m => !m.winner)
    .slice(0, 6)

  // ─── Presentation (skin) — derived view data, no scoring changes ─────
  const hasAnyResults = matches.some(m => m.winner)

  // Stable avatar colour per tipper (by name order)
  const userColor: Record<string, string> = {}
  users.forEach((u, i) => { userColor[u.id] = AVATAR_COLORS[i % AVATAR_COLORS.length] })

  // Points each tipper earned in the current round (for the "+N R16" chips).
  // Reuses the pure scoring fn scoped to the current round — no scoring change.
  const crScoreMap: Record<string, number> = {}
  if (currentRound) {
    for (const s of computeScores(users, currentRoundMatches, [currentRound], tips)) {
      crScoreMap[s.id] = s.totalPoints
    }
  }
  const currentRoundHasResults = currentRoundResultedCount > 0
  const currentRoundMyPoints = currentRound
    ? (roundBreakdown.find(r => r.round.id === currentRound.id)?.points ?? 0)
    : 0
  const unresolvedInRound = currentRoundMatches.filter(m => !m.winner).length

  const stats: StatCardData[] = [
    {
      label: 'Your rank',
      value: myRank != null ? String(myRank) : '—',
      sub: `/ ${numTippers}`,
      caption: myRank != null ? `of ${numTippers} tippers` : 'not ranked yet',
      color: 'var(--ink)',
    },
    {
      label: 'Your points',
      value: hasAnyResults ? String(myScore?.totalPoints ?? 0) : '—',
      sub: '',
      caption: currentRoundHasResults ? `+${currentRoundMyPoints} in the ${currentRoundLong}` : 'no points yet',
      color: 'var(--ink)',
    },
    {
      label: 'Behind leader',
      value: !hasAnyResults ? '—' : myRank === 1 ? `+${gap}` : `−${gap}`,
      sub: '',
      caption: myRank === 1 ? "you're out front" : `${leader?.display_name ?? 'leader'} out front`,
      color: 'var(--blue)',
    },
    {
      label: 'Accuracy',
      value: myAccuracy != null ? `${myAccuracy}%` : '—',
      sub: '',
      caption: myScore ? `${myScore.correctTips} of ${myScore.totalTips} tips` : 'no tips yet',
      color: 'var(--ink)',
    },
  ]

  const heroStatus = `${tipsInRound}/${totalInRound} tips in${lockCountdown ? ` · locks in ${lockCountdown}` : ''}`


  return (
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      <Masthead tournamentName={tournament.name} isAdmin={profile?.is_admin ?? false} />

      {/* Hero */}
      <section className="uso-hero relative overflow-hidden px-5 py-8 text-white md:px-8 md:py-11">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'linear-gradient(90deg, transparent, #000 55%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 55%)',
          }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
              <span>{tournament.name}</span>
              <span aria-hidden className="size-[7px] shrink-0 rounded-full bg-[var(--spark)]" />
              <span className="truncate">{meta.city}</span>
            </div>
            <h1 className="mt-2 font-serif text-[32px] font-bold leading-[1] tracking-[0.005em] md:text-[46px]">
              {headline.line1}{headline.line2 ? ` ${headline.line2}` : ''}
            </h1>
            {body.paragraphs[0]?.text && (
              <p className="mt-3 max-w-xl text-[14px] leading-[1.5]" style={{ color: '#DDE6FA' }}>
                {body.paragraphs[0].text}
              </p>
            )}
            <div className="mt-3 text-[13px] font-medium tabular-nums" style={{ color: '#B9CBF2' }}>{heroStatus}</div>
          </div>
          <span
            className="hidden shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white md:inline-flex"
            style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)' }}
          >
            <span aria-hidden className="size-2 rounded-full bg-[var(--spark)]" />
            {currentRoundLong} · {statusVerb}
          </span>
        </div>
      </section>

      {/* Stat cards */}
      <section className="px-5 pt-6 md:px-8">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      </section>

      {/* Leaderboard + Your rounds */}
      <section className="uso-two-col px-5 pt-5 md:px-8">
        {/* Leaderboard */}
        <div className="tp-card p-5">
          <div className="mb-1 flex items-center justify-between border-b border-[var(--rule)] pb-3">
            <h2 className="m-0 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">Leaderboard</h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--olive)]">
              <span aria-hidden className="size-[7px] rounded-full bg-[var(--olive)]" />Live
            </span>
          </div>
          {scores.length === 0 ? (
            <div className="py-6 text-[14px] text-[var(--ink-2)]">No tips judged yet. Standings appear once results land.</div>
          ) : (
            scores.slice(0, 6).map((s, i) => (
              <LeaderRow
                key={s.id}
                rank={i + 1}
                name={s.display_name}
                initials={initials(s.display_name)}
                avatarUrl={avatarMap[s.id]}
                color={userColor[s.id]}
                points={hasAnyResults ? s.totalPoints : null}
                move={currentRoundHasResults ? `+${crScoreMap[s.id] ?? 0} ${currentRound?.name ?? ''}` : null}
                isMe={s.id === user.id}
              />
            ))
          )}
          {scores.length > 6 && (
            <div className="pt-3 text-center">
              <Link
                href={`/tournaments/${tournament.slug}/leaderboard`}
                className="text-[12px] font-semibold tracking-[0.06em] text-[var(--blue)]"
              >
                + {scores.length - 6} more tippers
              </Link>
            </div>
          )}
        </div>

        {/* Your rounds */}
        <div className="tp-card p-5">
          <h2 className="m-0 mb-3.5 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">Your rounds</h2>
          {roundBreakdown.map(r => {
            const long = ROUND_LONG[r.round.name] ?? r.round.name
            const pct = r.resulted > 0 ? Math.round((r.correct / r.resulted) * 100) : 0
            let right = 'to come'
            let rightColor = 'var(--ink-3)'
            let barColor = 'var(--rule)'
            let opacity = 0.5
            if (r.state === 'done') {
              right = `${r.correct}/${r.resulted}`; rightColor = 'var(--ink)'; barColor = 'var(--olive)'; opacity = 1
            } else if (r.state === 'live') {
              right = `${r.correct}/${r.total} · live`; rightColor = 'var(--blue)'; barColor = 'var(--spark)'; opacity = 1
            }
            return (
              <div key={r.round.id} className="mb-3.5" style={{ opacity }}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    {long} <span className="font-medium text-[var(--ink-3)]">· {r.round.points_per_correct_tip} pts</span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums" style={{ color: rightColor }}>{right}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--rule)]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                </div>
              </div>
            )
          })}
          <Link
            href={`/tournaments/${tournament.slug}/tiebreaker`}
            className="mt-4 block border-t border-[var(--rule)] pt-4"
          >
            <div className="tp-eyebrow">Tiebreaker</div>
            <div className="mt-1.5 text-[14px] text-[var(--ink-2)]">
              Men&apos;s final games — <span className="font-semibold text-[var(--brick)]">set your call →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Points by round */}
      {chartData.length > 0 && (
        <section className="px-5 pt-5 md:px-8">
          <div className="tp-card p-5 md:px-6">
            <div className="mb-4 flex items-baseline justify-between border-b border-[var(--rule)] pb-3">
              <h2 className="m-0 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">Points by round</h2>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">cumulative · you in blue</span>
            </div>
            <CumulativePointsChart data={chartData} currentUserName={profile?.display_name ?? ''} />
          </div>
        </section>
      )}

      {/* Order of play */}
      <section className="px-5 pb-6 pt-5 md:px-8">
        <div className="tp-card p-5 md:px-6">
          <div className="mb-1 flex items-center justify-between border-b border-[var(--rule)] pb-3.5">
            <h2 className="m-0 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">Today&apos;s order of play</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
              {orderOfPlay.length || 'no'} {orderOfPlay.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
          {orderOfPlay.length === 0 ? (
            <div className="py-6 text-[14px] text-[var(--ink-2)]">No fixtures listed yet. Check back when the draw lands.</div>
          ) : (
            orderOfPlay.map((m, i) => (
              <OrderRow key={m.id} match={m} tips={tips} userId={user.id} now={now} isLast={i === orderOfPlay.length - 1} />
            ))
          )}
          {unresolvedInRound > orderOfPlay.length && (
            <div className="pt-3.5 text-center text-[13px] text-[var(--ink-2)]">
              <Link href={`/tournaments/${tournament.slug}/picks`} className="font-semibold text-[var(--blue)]">
                + {unresolvedInRound - orderOfPlay.length} more matches →
              </Link>
            </div>
          )}
        </div>
      </section>

      <TabBar tournamentSlug={tournament.slug ?? undefined} />
    </main>
  )
}

// ─── Small UI primitives ─────────────────────────────────────────────

interface StatCardData {
  label: string
  value: string
  sub: string
  caption: string
  color: string
}

function Masthead({ tournamentName, isAdmin }: { tournamentName: string | null; isAdmin: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
      <div className="flex items-center gap-3">
        <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
        <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
        {tournamentName && (
          <span className="hidden rounded-full bg-[var(--brick-surface)] px-2.5 py-1 font-serif text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-[var(--brick)] sm:inline">
            {tournamentName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">
        {isAdmin && <Link href="/admin" className="text-[var(--brick)]">Admin</Link>}
        <Link href="/profile" className="text-[var(--ink-2)] hover:text-[var(--ink)]">Profile</Link>
      </div>
    </header>
  )
}

function StatCard({ label, value, sub, caption, color }: StatCardData) {
  return (
    <div className="tp-card p-[18px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-3)]">{label}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-serif text-[38px] font-bold leading-[0.9] tabular-nums md:text-[42px]" style={{ color }}>{value}</span>
        {sub && <span className="font-serif text-[17px] font-semibold tabular-nums text-[var(--ink-3)]">{sub}</span>}
      </div>
      {caption && <div className="mt-2 text-[12px] text-[var(--ink-3)]">{caption}</div>}
    </div>
  )
}

function LeaderRow({
  rank, name, initials, avatarUrl, color, points, move, isMe,
}: {
  rank: number
  name: string
  initials: string
  avatarUrl: string | null | undefined
  color: string
  points: number | null
  move: string | null
  isMe: boolean
}) {
  return (
    <div
      className="mt-1 flex items-center gap-3 rounded-[12px] px-3 py-2.5"
      style={isMe ? { background: 'var(--you-bg)', boxShadow: 'inset 3px 0 0 var(--you-line)' } : undefined}
    >
      <span className="w-5 text-center font-serif text-[17px] font-semibold tabular-nums" style={{ color: isMe ? 'var(--brick)' : 'var(--ink-3)' }}>
        {rank}
      </span>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          style={{ width: 34, height: 34, flexShrink: 0, objectFit: 'cover', borderRadius: '9999px' }}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ width: 34, height: 34, flexShrink: 0, background: isMe ? 'var(--brick)' : color }}
        >
          {initials}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--ink)]" style={{ fontWeight: isMe ? 700 : 500 }}>
        {name}
        {isMe && <span className="font-medium text-[var(--ink-3)]"> · you</span>}
      </span>
      {move && (
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em]" style={{ color: 'var(--olive)', background: '#E7F3EC' }}>
          {move}
        </span>
      )}
      <span className="w-11 text-right font-serif text-[19px] font-bold tabular-nums text-[var(--ink)]">
        {points == null ? '—' : points}
      </span>
    </div>
  )
}

function OrderRow({
  match, tips, userId, now, isLast,
}: { match: Match; tips: Tip[]; userId: string; now: Date; isLast: boolean }) {
  const mine = tips.find(t => t.user_id === userId && t.match_id === match.id)
  const mySide = mine?.predicted_winner as 'player1' | 'player2' | undefined
  const locked = new Date(match.scheduled_start) <= now

  const c = locked ? consensusOf(match.id, tips) : null
  const roomFavour = c
    ? c.side === 'player1' ? stripSeed(match.player1_name) : stripSeed(match.player2_name)
    : null
  const agrees = c && mySide && c.side === mySide

  let cons = ''
  let consColor = 'var(--ink-3)'
  if (!locked) {
    cons = 'Consensus opens at lock.'
  } else if (c && mySide) {
    if (agrees) { cons = `${c.pct}% of the room agrees.` }
    else { cons = `Against the room · they favour ${roomFavour}.`; consColor = 'var(--blue)' }
  } else if (c) {
    cons = `${c.pct}% back ${roomFavour}.`
  }

  return (
    <div
      className={`py-3.5 ${isLast ? '' : 'border-b border-[var(--rule)]'}`}
      style={{ display: 'grid', gridTemplateColumns: '68px 1fr auto', alignItems: 'center', gap: '14px' }}
    >
      <span className="font-serif text-[14px] font-semibold tabular-nums text-[var(--ink-3)]">
        {fmtClock(new Date(match.scheduled_start))}
      </span>
      <div className="min-w-0">
        <div className="text-[16px] leading-[1.25] text-[var(--ink)]">
          <span style={{ fontWeight: mySide === 'player1' ? 600 : 400, borderBottom: mySide === 'player1' ? '2px solid var(--brick)' : 'none' }}>
            {stripSeed(match.player1_name)}
          </span>
          <span className="mx-1.5 text-[12px] text-[var(--ink-3)]">v</span>
          <span style={{ fontWeight: mySide === 'player2' ? 600 : 400, borderBottom: mySide === 'player2' ? '2px solid var(--brick)' : 'none' }}>
            {stripSeed(match.player2_name)}
          </span>
        </div>
        {cons && <div className="mt-1 text-[12px]" style={{ color: consColor }}>{cons}</div>}
      </div>
      <span
        className="shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={locked ? { color: 'var(--ink-3)', background: 'var(--paper-3)' } : { color: 'var(--blue)', background: 'var(--brick-surface)' }}
      >
        {locked ? 'locked' : 'open'}
      </span>
    </div>
  )
}
