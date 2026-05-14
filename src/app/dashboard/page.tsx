import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeScores } from '@/lib/scoring'
import CumulativePointsChart, { CumulativePointsData } from '@/components/charts/CumulativePointsChart'
import { TabBar } from '@/components/TabBar'
import Link from 'next/link'
import { Greeting } from './Greeting'

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
}

function computeRoundBreakdown(
  userId: string,
  rounds: Round[],
  matches: Match[],
  tips: Tip[]
): RoundBreakdown[] {
  return rounds.map(round => {
    const roundMatches = matches.filter(m => m.round_id === round.id)
    const resulted = roundMatches.filter(m => m.winner)
    const myTips = tips.filter(t => t.user_id === userId && roundMatches.some(m => m.id === t.match_id))
    const correct = myTips.filter(t => {
      const match = resulted.find(m => m.id === t.match_id)
      return match && t.predicted_winner === match.winner
    })
    return {
      round,
      points: correct.length * round.points_per_correct_tip,
      correct: correct.length,
      tipped: myTips.length,
      resulted: resulted.length,
      total: roundMatches.length,
    }
  })
}

function buildChartData(
  users: Array<{ id: string; display_name: string }>,
  rounds: Round[],
  matches: Match[],
  tips: Tip[]
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

function roundLongName(name: string) {
  const map: Record<string, string> = {
    R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
    R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
  }
  return map[name] ?? name
}

function stripSeed(name: string) {
  return name.replace(/\s*\[.*?\]/, '').trim()
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return 'locked'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: tournament }] = await Promise.all([
    supabase.from('users').select('display_name, is_admin').eq('id', user!.id).single(),
    supabase.from('tournaments').select('id, name, slug, start_date').eq('is_active', true).maybeSingle(),
  ])

  const firstName = profile?.display_name?.split(/[.\s@]/)[0] ?? 'mate'

  let scores = null
  let myScore = null
  let myRank: number | null = null
  let roundBreakdown: RoundBreakdown[] = []
  let rounds: Round[] = []
  let matches: Match[] = []
  let tips: Tip[] = []
  let upcomingRound: Round | null = null
  let upcomingMatches: Match[] = []
  let chartData: CumulativePointsData[] = []
  let tipsInRound = 0
  let totalInRound = 0
  let lockMs = 0

  if (tournament) {
    const { data: roundData } = await supabase
      .from('rounds')
      .select('id, name, points_per_correct_tip, sort_order')
      .eq('tournament_id', tournament.id)
      .order('sort_order')

    rounds = roundData ?? []
    const roundIds = rounds.map(r => r.id)

    const { data: matchData } = await supabase
      .from('matches')
      .select('id, round_id, winner, scheduled_start, player1_name, player2_name')
      .in('round_id', roundIds)
      .order('scheduled_start')

    matches = matchData ?? []
    const matchIds = matches.map(m => m.id)

    const [{ data: tipData }, { data: users }] = await Promise.all([
      matchIds.length
        ? supabase.from('tips').select('user_id, match_id, predicted_winner').in('match_id', matchIds)
        : Promise.resolve({ data: [] as Tip[] }),
      supabase.from('users').select('id, display_name').order('display_name'),
    ])

    tips = tipData ?? []
    scores = computeScores(users ?? [], matches, rounds, tips)
    const myIndex = scores.findIndex(s => s.id === user!.id)
    if (myIndex !== -1) {
      myScore = scores[myIndex]
      myRank = myIndex + 1
    }

    roundBreakdown = computeRoundBreakdown(user!.id, rounds, matches, tips)
    chartData = buildChartData(users ?? [], rounds, matches, tips)

    const now = new Date()
    for (const round of [...rounds].sort((a, b) => a.sort_order - b.sort_order)) {
      const roundMatches = matches.filter(m => m.round_id === round.id)
      const unpicked = roundMatches.filter(m =>
        new Date(m.scheduled_start) > now &&
        !tips.some(t => t.user_id === user!.id && t.match_id === m.id)
      )
      if (unpicked.length > 0) {
        upcomingRound = round
        upcomingMatches = unpicked.sort((a, b) =>
          new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
        )
        break
      }
    }

    // Tips progress for the first in-progress round
    const inProgressRound = rounds.find(round => {
      const rm = matches.filter(m => m.round_id === round.id)
      return rm.some(m => new Date(m.scheduled_start) <= now) && rm.some(m => !m.winner)
    }) ?? upcomingRound
    if (inProgressRound) {
      const rm = matches.filter(m => m.round_id === inProgressRound.id)
      totalInRound = rm.length
      tipsInRound = tips.filter(t => t.user_id === user!.id && rm.some(m => m.id === t.match_id)).length
    }

    const firstUnlocked = matches.find(m => new Date(m.scheduled_start) > now)
    lockMs = firstUnlocked ? new Date(firstUnlocked.scheduled_start).getTime() - Date.now() : 0
  }

  const dayNum = tournament?.start_date
    ? Math.max(1, Math.ceil((Date.now() - new Date(tournament.start_date).getTime()) / 86_400_000))
    : 1

  const weekday = new Date().toLocaleDateString('en-AU', { weekday: 'short' })
  const currentRoundName = roundLongName(upcomingRound?.name ?? roundBreakdown.at(-1)?.round.name ?? 'Round')

  const editorLine = !myRank ? 'Welcome to the comp. Get tipping.'
    : myRank === 1 ? "You're top of the pile. Hold the line."
    : myRank === 2 ? 'Second. The leader can be caught.'
    : myRank === 3 ? "You're third. A bold afternoon could change that."
    : `${myRank}th. Time for a bold call.`

  return (
    <main className="min-h-screen flex flex-col bg-[#FAF6EC] text-[#1B1814] relative">
      {/* Dotted texture */}
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1B1814 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      {/* Masthead */}
      <header className="relative z-10 px-5 py-3.5 flex items-baseline justify-between border-b border-[#1B181420]">
        <Link href="/dashboard" className="font-serif italic text-[22px] leading-none tracking-tight">
          The Tipping Post
        </Link>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] text-[#3C342C]">
          {tournament ? `${tournament.name} · ${weekday}` : weekday}
          {profile?.is_admin && (
            <Link href="/admin" className="text-[#B85433] font-semibold">Admin</Link>
          )}
          <Link href="/profile" className="hover:text-[#1B1814]">Profile</Link>
        </div>
      </header>

      {!tournament ? (
        <section className="relative z-10 px-5 py-16 text-center flex-1">
          <h1 className="font-serif text-4xl italic mb-3">Off-season.</h1>
          <p className="text-[#3C342C] italic font-serif text-lg">
            Nothing live right now. Check back when the next Slam fires up.
          </p>
        </section>
      ) : (
        <>
          {/* Clay banner */}
          <section className="relative z-10 px-5 py-4 overflow-hidden text-[#FAF6EC] bg-[#B85433]">
            <div aria-hidden
                 className="absolute -right-8 -top-3 text-[140px] leading-none italic
                            font-serif text-white/[0.06] select-none pointer-events-none">
              {tournament.slug?.split('-')[0]?.toUpperCase() ?? 'GS'}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-80">
              {tournament.name} · Day {dayNum}
            </div>
            <h1 className="font-serif text-3xl leading-[1.05] tracking-tight mt-1">
              {currentRoundName}
              <br />
              <span className="italic text-[#F2EBDC]">
                {lockMs > 0 ? `locks in ${fmtCountdown(lockMs)}.` : 'locked.'}
              </span>
            </h1>
            <div className="mt-3 flex items-center gap-3.5 text-xs text-white/85">
              <span><b className="text-white font-semibold">{tipsInRound}</b> of {totalInRound} picks in</span>
              <span className="w-[3px] h-[3px] rounded-full bg-white/40" />
              <span>{Math.max(0, totalInRound - tipsInRound)} still to call</span>
            </div>
          </section>

          {/* From the Editor */}
          <section className="relative z-10 px-5 pt-4 pb-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#3C342C] mb-1.5 font-semibold">
              From the Editor
            </div>
            <Greeting firstName={firstName} editorLine={editorLine} />
          </section>

          {/* Pick of the day — next unlocked unconfirmed match */}
          {upcomingMatches[0] && (
            <section className="relative z-10 px-5 pb-4">
              <div className="border border-[#1B181420] rounded-[2px] bg-[#F2EBDC] p-4">
                <div className="flex justify-between items-baseline text-[10px] uppercase tracking-[0.18em] font-semibold text-[#B85433]">
                  <span>Pick of the day</span>
                  <Link
                    href={`/tournaments/${tournament.slug}/round/${upcomingRound!.name}`}
                    className="text-[#3C342C] font-normal normal-case text-[11px] hover:text-[#1B1814]"
                  >
                    {upcomingRound!.name} · {upcomingMatches.length} to go →
                  </Link>
                </div>
                <div className="font-serif text-2xl leading-[1.1] tracking-tight mt-2">
                  {stripSeed(upcomingMatches[0].player1_name)}{' '}
                  <span className="italic text-[#3C342C]">v</span>{' '}
                  {stripSeed(upcomingMatches[0].player2_name)}
                </div>
                <Link
                  href={`/tournaments/${tournament.slug}/round/${upcomingRound!.name}`}
                  className="mt-3 inline-block bg-[#B85433] hover:bg-[#8E3A1F] text-[#FAF6EC]
                             px-4 py-2 text-[11px] uppercase tracking-[0.18em] font-semibold
                             rounded-[2px] transition-colors"
                >
                  Make your pick →
                </Link>
              </div>
            </section>
          )}

          {/* Standings + Chart: stacked on mobile, side-by-side on desktop */}
          <div className="relative z-10 md:grid md:grid-cols-2 md:gap-8 md:px-5 md:pb-4 md:pt-2">

            {/* Left col: Standings + Round breakdown */}
            <div className="space-y-4 md:space-y-0">
              <section className="px-5 pb-4 md:px-0 md:pb-0">
                <div className="flex items-baseline justify-between pb-2 border-b-2 border-[#1B1814] mb-2.5">
                  <h2 className="font-serif text-lg tracking-tight">The Standings</h2>
                  <Link
                    href={`/tournaments/${tournament.slug}/leaderboard`}
                    className="text-[10px] uppercase tracking-[0.18em] text-[#3C342C] hover:text-[#1B1814]"
                  >
                    See all
                  </Link>
                </div>
                {!scores?.length ? (
                  <div className="text-sm text-[#3C342C] italic font-serif py-4">
                    No tips judged yet. Wait till results land.
                  </div>
                ) : (
                  <>
                    {scores.slice(0, 5).map((s, i) => {
                      const isMe = s.id === user!.id
                      const isLast = i === Math.min(scores.length, 5) - 1
                      return (
                        <div
                          key={s.id}
                          className={`grid grid-cols-[22px_1fr_40px_48px_36px] gap-2.5 py-2 items-baseline text-[13px]
                                      ${isMe ? 'text-[#B85433] font-semibold' : 'text-[#1B1814]'}
                                      ${isLast ? '' : 'border-b border-dotted border-[#1B181420]'}`}
                        >
                          <div className={`font-serif text-base italic ${isMe ? 'text-[#B85433]' : 'text-[#3C342C]'}`}>
                            {i + 1}
                          </div>
                          <div className="truncate">
                            {s.display_name}
                            {isMe && <span className="italic font-normal text-[#3C342C]"> · you</span>}
                          </div>
                          <div className="text-right font-serif text-lg tabular-nums">{s.totalPoints}</div>
                          <div className="text-right tabular-nums text-[10px] text-[#3C342C]">
                            {s.correctTips}/{s.totalTips}
                          </div>
                          <div className="text-right tabular-nums text-[10px] text-[#1B181450]">
                            {s.totalTips > 0 ? `${Math.round((s.correctTips / s.totalTips) * 100)}%` : '—'}
                          </div>
                        </div>
                      )
                    })}
                    {myRank && myRank > 5 && myScore && (
                      <>
                        <div className="text-center text-[10px] tracking-[0.4em] text-[#3C342C40] py-1.5">···</div>
                        <div className="grid grid-cols-[22px_1fr_40px_48px_36px] gap-2.5 py-2 items-baseline text-[13px] text-[#B85433] font-semibold">
                          <div className="font-serif text-base italic text-[#B85433]">{myRank}</div>
                          <div className="truncate">{myScore.display_name}<span className="italic font-normal text-[#3C342C]"> · you</span></div>
                          <div className="text-right font-serif text-lg tabular-nums">{myScore.totalPoints}</div>
                          <div className="text-right tabular-nums text-[10px] text-[#3C342C]">
                            {myScore.correctTips}/{myScore.totalTips}
                          </div>
                          <div className="text-right tabular-nums text-[10px] text-[#1B181450]">
                            {myScore.totalTips > 0 ? `${Math.round((myScore.correctTips / myScore.totalTips) * 100)}%` : '—'}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>

              {roundBreakdown.length > 0 && (
                <section className="px-5 pb-4 md:px-0 md:pb-0 md:mt-6">
                  <div className="pb-2 border-b-2 border-[#1B1814] mb-2.5">
                    <h2 className="font-serif text-lg tracking-tight">Your rounds</h2>
                  </div>
                  <div>
                    {roundBreakdown.map(({ round, points, correct, tipped, resulted, total }, i) => {
                      const barPct = resulted > 0 ? Math.round((correct / resulted) * 100) : 0
                      const hasResults = resulted > 0
                      const isLast = i === roundBreakdown.length - 1
                      return (
                        <div
                          key={round.id}
                          className={`py-2.5 ${isLast ? '' : 'border-b border-dotted border-[#1B181420]'}`}
                        >
                          <div className="flex items-baseline justify-between mb-1.5">
                            <div className="flex items-baseline gap-2">
                              <Link
                                href={`/tournaments/${tournament.slug}/round/${round.name}`}
                                className="text-[13px] font-semibold text-[#1B1814] hover:text-[#B85433]"
                              >
                                {round.name}
                              </Link>
                              <span className="text-[10px] uppercase tracking-[0.1em] text-[#3C342C]">
                                {round.points_per_correct_tip}pt
                              </span>
                            </div>
                            <div className="flex items-baseline gap-3 text-[13px]">
                              <span className="text-[#3C342C] tabular-nums">
                                {hasResults ? `${correct}/${resulted}` : total > 0 ? `${tipped} tipped` : '—'}
                              </span>
                              <span className="font-serif text-base tabular-nums text-[#1B1814]">
                                {hasResults ? points : '—'}
                              </span>
                            </div>
                          </div>
                          <div className="h-[3px] rounded-full bg-[#1B181415] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: hasResults ? `${barPct}%` : '0%',
                                background: resulted < total ? '#B85433' : '#3D4F2B',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Right col: Chart */}
            {chartData.length > 0 && (
              <section className="px-5 pb-4 md:px-0 md:pb-0">
                <div className="pb-2 border-b-2 border-[#1B1814] mb-4">
                  <h2 className="font-serif text-lg tracking-tight">Points by round</h2>
                </div>
                <CumulativePointsChart data={chartData} currentUserName={profile?.display_name ?? ''} />
              </section>
            )}

          </div>

          {/* Pull quote */}
          <section className="relative z-10 px-5 pb-6">
            <div className="border-l-[3px] border-[#B85433] pl-3
                            font-serif text-[17px] leading-[1.25]
                            italic text-[#3C342C] tracking-tight">
              {tipsInRound === 0
                ? <>Round opens. <span className="text-[#1B1814] not-italic font-medium">Nothing in yet — get on it.</span></>
                : tipsInRound === totalInRound
                ? <>All in. <span className="text-[#1B1814] not-italic font-medium">Now we wait.</span></>
                : <>{totalInRound - tipsInRound} still to call. <span className="text-[#1B1814] not-italic font-medium">Don&apos;t dawdle.</span></>}
            </div>
          </section>
        </>
      )}

      <TabBar tournamentSlug={tournament?.slug ?? undefined} />
    </main>
  )
}
