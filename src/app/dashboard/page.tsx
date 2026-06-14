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
      return match && t.predicted_winner === match.winner
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
    const roundMatches = matches.filter(m => m.round_id === round.id && m.winner)
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

function streakFor(userId: string, matches: Match[], tips: Tip[]): number {
  const resulted = matches
    .filter(m => m.winner)
    .sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime())
  let streak = 0
  for (const m of resulted) {
    const t = tips.find(x => x.user_id === userId && x.match_id === m.id)
    if (!t || t.predicted_winner !== m.winner) break
    streak++
  }
  return streak
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

  const [{ data: profile }, { data: tournament }, { count: readerCount }] = await Promise.all([
    supabase.from('users').select('display_name, is_admin').eq('id', user.id).single(),
    supabase.from('tournaments').select('id, name, slug, start_date').eq('is_active', true).maybeSingle(),
    supabase.from('users').select('id', { count: 'exact', head: true }),
  ])

  const yourName = profile?.display_name?.split(/[.\s@]/)[0] ?? 'mate'
  const weekday = now.toLocaleDateString('en-AU', { timeZone: AEST_TZ, weekday: 'short' })

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
      <main className="relative flex min-h-screen flex-col">
        <div aria-hidden className="tp-paper-grain" />
        <Masthead weekday={weekday} readers={readerCount ?? 0} isAdmin={profile?.is_admin ?? false} />
        <section className="relative z-10 mx-auto max-w-3xl px-5 py-20 text-center">
          <div className="tp-eyebrow mb-3">{offHeadline.kicker}</div>
          <h1 className="font-serif text-[40px] leading-[1.05] tracking-tight md:text-[56px]">
            {offHeadline.line1}
            <br />
            <span className="italic text-[var(--ink-2)]">{offHeadline.line2}</span>
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
    .select('id, round_id, winner, scheduled_start, player1_name, player2_name')
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
  const chartData = buildChartData(users ?? [], rounds, matches, tips)

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

  // Banner phrase — British register for the masthead lawn banner
  const bannerStatus =
    statusVerb === 'complete'
      ? 'all done on the lawns'
      : statusVerb === 'to come'
        ? 'still to come'
        : 'underway on the lawns'

  const dayNum = tournament.start_date
    ? Math.max(1, Math.ceil((now.getTime() - new Date(tournament.start_date).getTime()) / 86_400_000))
    : 1

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

  // ─── Pull quote ─────────────────────────────────────────────────────
  let pullItalic: string | null = null
  let pullPunch: string | null = null
  if (totalInRound > 0 && tipsInRound === 0) {
    pullItalic = 'Round opens.'
    pullPunch = 'Nothing in yet — get on it.'
  } else if (totalInRound > 0 && tipsInRound === totalInRound) {
    pullItalic = 'All in.'
    pullPunch = 'Now we wait.'
  } else if (totalInRound > 0) {
    pullItalic = `${totalInRound - tipsInRound} still to call.`
    pullPunch = "Don't dawdle."
  }

  const myCorrectStreak = streakFor(user.id, matches, tips)
  const hasAnyResults = matches.some(m => m.winner)

  return (
    <main className="relative flex min-h-screen flex-col">
      <div aria-hidden className="tp-paper-grain" />

      {/* Broadsheet masthead */}
      <header
        className="relative z-10 border-b-[3px] border-double border-[var(--ink)] px-4 pt-6 md:px-8"
      >
        {/* Edition strip */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--rule)] pb-3 text-[9px] uppercase tracking-[0.2em] text-[var(--ink-2)] md:text-[10px]">
          <span>Vol. I · No. {String(dayNum).padStart(2, '0')}</span>
          <span>{weekday} · Day {dayNum}</span>
          <span className="hidden md:inline">Subscribers only · {readerCount ?? 0} readers</span>
          <span className="flex items-center gap-4">
            {profile?.is_admin && <Link href="/admin" className="text-[var(--brick)] font-semibold">Admin</Link>}
            <Link href="/profile" className="hover:text-[var(--ink)]">Profile</Link>
          </span>
        </div>
        <h1 className="m-0 mb-1.5 mt-4 text-center font-serif italic leading-none tracking-tight text-[42px] md:mb-2 md:mt-5 md:text-[84px]">
          The Tipping Post
        </h1>
        <div className="pb-3 text-center text-[8px] uppercase tracking-[0.28em] text-[var(--ink-2)] md:pb-4 md:text-[10px] md:tracking-[0.35em]">
          A private dispatch from the {tournament.name}
        </div>
      </header>

      {/* Mown-lawn banner — the Wimbledon signature colour hit */}
      <div className="tp-banner relative z-10 overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none font-serif font-medium leading-none tracking-[-0.02em] text-[var(--paper)] opacity-[0.08] text-[110px] md:right-6 md:text-[210px]"
        >
          SW19
        </span>
        <div className="relative px-4 py-8 md:px-8 md:py-14">
          <div className="mb-2 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--paper)] opacity-70 md:mb-3 md:text-[11px]">
            The Championships · SW19
          </div>
          <h2 className="m-0 font-serif tracking-tight text-[var(--paper)] text-[30px] leading-[1.05] md:text-[50px] md:leading-[1.02]">
            {currentRoundLong}, <span className="italic">{bannerStatus}</span>
          </h2>
        </div>
      </div>

      {/* Section heading bar — front-page meta */}
      <div className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule)] px-4 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[var(--ink-2)] md:px-8 md:py-3 md:text-[11px] md:tracking-[0.2em]">
        <span className="hidden md:inline">The front page</span>
        <span className="font-semibold text-[var(--brick)]">
          {currentRoundLong} · <span className="italic normal-case tracking-normal">{statusVerb}</span>
        </span>
        <span>
          {totalInRound > 0 ? `${tipsInRound}/${totalInRound} in` : 'no fixtures yet'}
          {lockCountdown ? ` · locks in ${lockCountdown}` : ''}
        </span>
      </div>

      {/* Above the fold — Lead + Sidebar */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[3fr_2fr]">
        {/* Lead story */}
        <article className="px-4 pb-6 pt-5 md:border-r md:border-[var(--rule)] md:px-8 md:pb-6 md:pt-7">
          <div className="tp-eyebrow tp-eyebrow--brick mb-2.5">{headline.kicker}</div>
          <h2 className="m-0 mb-3 font-serif tracking-tight text-[32px] leading-[1.05] md:text-[52px] md:leading-[1.04]">
            {headline.line1}
            <br />
            <span className="italic">{headline.line2}</span>
          </h2>

          {body.paragraphs.length > 0 && (
            <>
              <div className="mb-3.5 border-b border-dotted border-[var(--rule)] pb-3 font-serif italic text-[14px] leading-[1.4] text-[var(--ink-2)] md:text-[16px]">
                {body.paragraphs[0]?.text}
              </div>
              {body.paragraphs.length > 1 && (
                <div
                  className="font-sans text-[14px] leading-[1.55] text-[var(--ink-2)] [&>p]:m-0 [&>p:not(:last-child)]:mb-3 md:columns-2 md:gap-6 md:[column-rule:1px_solid_var(--rule-soft)]"
                >
                  {body.paragraphs.slice(1).map((p, i) => {
                    const first = p.text.trimStart()[0]
                    const isLetter = first && /[A-Za-z]/.test(first)
                    if (i === 0 && p.dropCap !== false && isLetter) {
                      const lead = p.text.trimStart()
                      return (
                        <p key={i}>
                          <span className="float-left pr-2 pt-1 font-serif italic text-[48px] leading-[0.85] text-[var(--ink)] md:text-[56px]">
                            {lead[0]}
                          </span>
                          {lead.slice(1)}
                        </p>
                      )
                    }
                    return <p key={i}>{p.text}</p>
                  })}
                </div>
              )}
            </>
          )}
        </article>

        {/* Sidebar — Standings + By the numbers */}
        <aside className="border-t border-[var(--rule)] px-4 pb-6 pt-5 md:border-t-0 md:px-8 md:pt-7">
          <div className="tp-eyebrow mb-1 flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
            <span>The Standings · <span className="tp-eyebrow--brick">Live</span></span>
            <Link href={`/tournaments/${tournament.slug}/leaderboard`} className="tp-eyebrow hover:text-[var(--ink)]">See all</Link>
          </div>
          {!scores.length ? (
            <div className="py-4 font-serif italic text-[var(--ink-2)]">
              No tips judged yet. Wait till results land.
            </div>
          ) : (
            <>
              {scores.slice(0, 5).map((s, i) => {
                const isMe = s.id === user.id
                const avatar = avatarMap[s.id]
                return (
                  <StandingsRow
                    key={s.id}
                    rank={i + 1}
                    name={s.display_name}
                    avatarUrl={avatar}
                    points={hasAnyResults ? s.totalPoints : null}
                    isMe={isMe}
                  />
                )
              })}
              {myRank && myRank > 5 && myScore && (
                <>
                  <div className="py-1.5 text-center text-[10px] tracking-[0.4em] text-[var(--ink-4)]">···</div>
                  <StandingsRow
                    rank={myRank}
                    name={myScore.display_name}
                    avatarUrl={avatarMap[myScore.id]}
                    points={hasAnyResults ? myScore.totalPoints : null}
                    isMe
                  />
                </>
              )}
            </>
          )}

          {/* By the numbers */}
          <div className="tp-card mt-5 p-4">
            <div className="tp-eyebrow tp-eyebrow--brick mb-3">By the numbers</div>
            <div className="grid grid-cols-2 gap-3.5">
              <Stat label="Your points" value={hasAnyResults ? (myScore?.totalPoints ?? 0) : '—'} />
              <Stat
                label={myRank === 1 ? 'Lead over 2nd' : numTippers >= 3 ? 'Leader gap' : 'Tippers'}
                value={
                  numTippers < 3
                    ? numTippers
                    : !hasAnyResults
                      ? '—'
                      : myRank === 1
                        ? `+${gap}`
                        : `−${gap}`
                }
              />
              <Stat label="Strike rate" value={myAccuracy != null ? `${myAccuracy}%` : '—'} />
              <Stat label="On the trot" value={myCorrectStreak > 0 ? `${myCorrectStreak} ties` : '—'} />
            </div>
          </div>
        </aside>
      </div>

      {/* Below the fold marker */}
      <div className="relative z-10 border-y border-[var(--rule)] [border-top:3px_double_var(--ink)] px-4 py-2.5 text-center text-[9px] uppercase tracking-[0.3em] text-[var(--ink-2)] md:px-8 md:text-[10px]">
        · Below the fold ·
      </div>

      {/* Below the fold — Order of play + Chart */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[4fr_5fr]">
        <section className="px-4 pb-6 pt-5 md:border-r md:border-[var(--rule)] md:px-8 md:pt-6">
          <div className="mb-1 flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
            <h3 className="m-0 font-serif text-[19px] tracking-tight md:text-[22px]">Today&apos;s order of play</h3>
            <span className="tp-eyebrow">{orderOfPlay.length || 'no'} matches</span>
          </div>
          {orderOfPlay.length === 0 ? (
            <div className="py-4 font-serif italic text-[var(--ink-2)]">
              No fixtures listed yet. Check back when the draw lands.
            </div>
          ) : (
            <>
              {/* Desktop: show all; Mobile: 4 max */}
              <div className="md:hidden">
                {orderOfPlay.slice(0, 4).map((m, i) => (
                  <OrderRow
                    key={m.id}
                    match={m}
                    tips={tips}
                    userId={user.id}
                    now={now}
                    isLast={i === Math.min(3, orderOfPlay.length - 1)}
                  />
                ))}
                {orderOfPlay.length > 4 && (
                  <div className="pt-3 text-center font-serif italic text-[12px] text-[var(--ink-2)]">
                    + {orderOfPlay.length - 4} more · <Link href={`/tournaments/${tournament.slug}/picks`} className="text-[var(--brick)]">see Picks →</Link>
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                {orderOfPlay.map((m, i) => (
                  <OrderRow
                    key={m.id}
                    match={m}
                    tips={tips}
                    userId={user.id}
                    now={now}
                    isLast={i === orderOfPlay.length - 1}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="border-t border-[var(--rule)] px-4 pb-6 pt-5 md:border-t-0 md:px-8 md:pt-6">
          <div className="mb-3 flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
            <h3 className="m-0 font-serif text-[19px] tracking-tight md:text-[22px]">Points by round</h3>
          </div>
          {chartData.length > 0 ? (
            <CumulativePointsChart data={chartData} currentUserName={profile?.display_name ?? ''} />
          ) : (
            <div className="py-4 font-serif italic text-[var(--ink-2)]">
              No results to chart yet.
            </div>
          )}

          {/* Your rounds — desktop only */}
          {roundBreakdown.length > 0 && (
            <div className="mt-6 hidden md:block">
              <div className="tp-eyebrow mb-2.5">Your rounds</div>
              <div className="grid grid-cols-6 gap-3">
                {roundBreakdown.map(r => {
                  const pct = r.resulted > 0 ? (r.correct / r.resulted) * 100 : 0
                  const active = r.state !== 'pending'
                  return (
                    <div key={r.round.id} className={active ? '' : 'opacity-40'}>
                      <div className="text-[12px] font-medium leading-none">
                        {r.round.name}
                        <span className="ml-1 text-[9px] text-[var(--ink-3)]">{r.round.points_per_correct_tip}pt</span>
                      </div>
                      <div className="mb-1.5 mt-1 font-serif text-[24px] leading-none tabular-nums">
                        {active ? r.points : '—'}
                      </div>
                      <div className="h-[2px] bg-[var(--rule-soft)]">
                        <div
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            background: r.state === 'live' ? 'var(--violet)' : 'var(--olive)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Pull quote */}
      {pullItalic && pullPunch && (
        <section className="relative z-10 px-4 pb-7 pt-2 md:px-8">
          <div className="tp-pull">
            {pullItalic} <span className="tp-pull__punch">{pullPunch}</span>
          </div>
        </section>
      )}

      <TabBar tournamentSlug={tournament.slug ?? undefined} />
    </main>
  )
}

// ─── Small UI primitives ─────────────────────────────────────────────

function Masthead({ weekday, readers, isAdmin }: { weekday: string; readers: number; isAdmin: boolean }) {
  return (
    <header className="relative z-10 border-b-[3px] border-double border-[var(--ink)] px-4 pt-6 md:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--rule)] pb-3 text-[9px] uppercase tracking-[0.2em] text-[var(--ink-2)] md:text-[10px]">
        <span>Off-season</span>
        <span>{weekday}</span>
        <span className="hidden md:inline">Subscribers only · {readers} readers</span>
        <span className="flex items-center gap-4">
          {isAdmin && <Link href="/admin" className="text-[var(--brick)] font-semibold">Admin</Link>}
          <Link href="/profile" className="hover:text-[var(--ink)]">Profile</Link>
        </span>
      </div>
      <h1 className="m-0 mb-1.5 mt-4 text-center font-serif italic leading-none tracking-tight text-[42px] md:mb-2 md:mt-5 md:text-[84px]">
        The Tipping Post
      </h1>
      <div className="pb-3 text-center text-[8px] uppercase tracking-[0.28em] text-[var(--ink-2)] md:pb-4 md:text-[10px] md:tracking-[0.35em]">
        A private sports broadsheet
      </div>
    </header>
  )
}

function StandingsRow({
  rank, name, avatarUrl, points, isMe,
}: { rank: number; name: string; avatarUrl: string | null | undefined; points: number | null; isMe: boolean }) {
  return (
    <div
      className={`grid grid-cols-[24px_22px_1fr_auto] items-center gap-2.5 border-b border-dotted border-[var(--rule)] py-3 ${
        isMe ? 'text-[var(--violet)]' : 'text-[var(--ink)]'
      }`}
    >
      <div className={`font-serif italic text-[19px] leading-none md:text-[22px] ${isMe ? 'text-[var(--violet)]' : 'text-[var(--ink-2)]'}`}>
        {rank}
      </div>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-[22px] shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--brick-dark)] text-[9px] font-medium text-[var(--paper)]">
          {name[0]?.toUpperCase()}
        </div>
      )}
      <div className={`truncate text-[14px] leading-[1.2] ${isMe ? 'font-medium' : 'font-normal'}`}>
        {name}
        {isMe && <span className="ml-1 italic font-normal text-[var(--violet)]">· you</span>}
      </div>
      <div className="min-w-[36px] text-right font-serif text-[19px] leading-none tabular-nums md:text-[22px]">
        {points == null ? '—' : points}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-2)]">{label}</div>
      <div className="font-serif text-[24px] leading-none tabular-nums md:text-[28px]">{value}</div>
    </div>
  )
}

function OrderRow({
  match, tips, userId, now, isLast,
}: { match: Match; tips: Tip[]; userId: string; now: Date; isLast: boolean }) {
  const mine = tips.find(t => t.user_id === userId && t.match_id === match.id)
  const mySide = mine?.predicted_winner as 'player1' | 'player2' | undefined
  const locked = new Date(match.scheduled_start) <= now

  // Hide consensus until the match is locked.
  const c = locked ? consensusOf(match.id, tips) : null
  const roomFavour = c
    ? c.side === 'player1' ? stripSeed(match.player1_name) : stripSeed(match.player2_name)
    : null
  const agreesWithMe = c && mySide && c.side === mySide

  return (
    <div
      className={`grid grid-cols-[54px_1fr_70px] items-center gap-3.5 py-3 ${
        isLast ? '' : 'border-b border-dotted border-[var(--rule)]'
      } ${locked ? 'opacity-70' : ''}`}
    >
      <div className="font-serif italic text-[15px] leading-none tabular-nums text-[var(--ink-2)] md:text-[16px]">
        {fmtClock(new Date(match.scheduled_start))}
      </div>
      <div>
        <div className="font-serif text-[15px] leading-[1.2] md:text-[17px] md:leading-[1.15]">
          <span
            style={{
              fontWeight: mySide === 'player1' ? 500 : 400,
              textDecoration: mySide === 'player1' ? 'underline var(--violet) 1.5px' : 'none',
              textUnderlineOffset: 4,
            }}
          >
            {stripSeed(match.player1_name)}
          </span>
          <span className="mx-1.5 italic text-[var(--ink-3)] md:mx-2">v</span>
          <span
            style={{
              fontWeight: mySide === 'player2' ? 500 : 400,
              textDecoration: mySide === 'player2' ? 'underline var(--violet) 1.5px' : 'none',
              textUnderlineOffset: 4,
            }}
          >
            {stripSeed(match.player2_name)}
          </span>
        </div>
        {c && mySide ? (
          agreesWithMe ? (
            <div className="mt-1 text-[11px] text-[var(--ink-3)]">{c.pct}% of the room agrees</div>
          ) : (
            <div className="mt-1 text-[11px] text-[var(--violet)]">against the room · they favour {roomFavour}</div>
          )
        ) : null}
      </div>
      <div className="text-right">
        <span
          className={`text-[9px] font-medium uppercase tracking-[0.18em] ${
            locked ? 'text-[var(--ink-3)]' : 'text-[var(--brick)]'
          }`}
        >
          {locked ? 'locked' : 'open'}
        </span>
      </div>
    </div>
  )
}
