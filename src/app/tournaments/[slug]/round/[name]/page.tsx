import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import MatchCard from './MatchCard'
import { TabBar } from '@/components/TabBar'

function roundLongName(n: string) {
  return ({
    R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
    R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
  } as Record<string, string>)[n] ?? n
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return 'locked'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

export default async function RoundPage({
  params,
}: {
  params: Promise<{ slug: string; name: string }>
}) {
  const { slug, name: roundName } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  const { data: allRounds } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .order('sort_order')

  const round = (allRounds ?? []).find(r => r.name === roundName)
  if (!round) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, player1_name, player2_name, scheduled_start, winner')
    .eq('round_id', round.id)
    .order('scheduled_start')

  const matchIds = matches?.map(m => m.id) ?? []
  const { data: tips } = matchIds.length
    ? await supabase
        .from('tips')
        .select('match_id, predicted_winner')
        .eq('user_id', user!.id)
        .in('match_id', matchIds)
    : { data: [] }

  const tipsByMatchId = Object.fromEntries(
    (tips ?? []).map(t => [t.match_id, t])
  )

  const now = Date.now()
  const picked = (tips ?? []).length
  const total = matches?.length ?? 0
  const firstUnlocked = matches?.find(m => new Date(m.scheduled_start).getTime() > now)
  const lockMs = firstUnlocked ? new Date(firstUnlocked.scheduled_start).getTime() - now : 0
  const fullyLocked = !firstUnlocked
  const remaining = total - picked

  // Pair matches into groups of 2 (feeds next round)
  const ROUND_ORDER = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F']
  const nextRoundName = ROUND_ORDER[ROUND_ORDER.indexOf(roundName) + 1] ?? 'F'
  const groups: (typeof matches & {})[] = []
  if (matches) {
    for (let i = 0; i < matches.length; i += 2) {
      groups.push(matches.slice(i, i + 2) as any)
    }
  }

  const firstUnpickedGroupIdx = groups.findIndex((group: any) =>
    (group as any[]).some((m: any) =>
      new Date(m.scheduled_start).getTime() > now && !tipsByMatchId[m.id]
    )
  )
  const nextPickHref = firstUnpickedGroupIdx >= 0 ? `#group-${firstUnpickedGroupIdx}` : undefined

  return (
    <main className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] relative">
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--ink) 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-[var(--paper)] border-b border-[#15231B20] px-5 pt-3.5 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Link href="/dashboard" className="flex items-center gap-2 text-[var(--ink-2)]">
            <span className="text-lg leading-none">‹</span>
            <span className="text-[10px] uppercase tracking-[0.18em]">{tournament.name}</span>
          </Link>
        </div>
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[28px] leading-none tracking-tight">
            {roundLongName(roundName)}
          </h1>
          <span className={`text-xs font-semibold tracking-wide ${fullyLocked ? 'text-[var(--ink-2)]' : 'text-[var(--brick)]'}`}>
            ● {fullyLocked ? 'Locked' : `Locks ${fmtCountdown(lockMs)}`}
          </span>
        </div>
        {/* Round tab strip */}
        <div className="flex gap-3.5 mt-3 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-2)] overflow-x-auto pb-px">
          {(allRounds ?? []).map(r => {
            const active = r.name === roundName
            return (
              <Link
                key={r.name}
                href={`/tournaments/${slug}/round/${r.name}`}
                className={`shrink-0 pb-1 border-b-2 ${active
                  ? 'text-[var(--ink)] font-bold border-[var(--brick)]'
                  : 'border-transparent hover:text-[var(--ink)]'}`}
              >
                {r.name}
              </Link>
            )
          })}
        </div>
      </header>

      {/* Match list */}
      <section className="relative z-10 px-5 pt-3.5 pb-56 flex-1">
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="font-serif text-2xl italic text-[var(--ink-2)] tracking-tight">
              No matches yet for {roundLongName(roundName)}.
            </div>
            <div className="text-sm text-[var(--ink-2)] mt-1">Admin&apos;s still loading the fixtures.</div>
          </div>
        ) : (
          groups.map((group, gi) => (
            <div key={gi} id={`group-${gi}`} className="mb-6 scroll-mt-32">
              <div className="flex justify-between items-baseline text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] mb-2">
                <span>Feeds {nextRoundName} {gi + 1}</span>
                <span className="italic font-serif tracking-normal normal-case text-[11px]">
                  {gi === 0 ? 'top of draw' : gi === groups.length - 1 ? 'bottom of draw' : ''}
                </span>
              </div>
              <div className="relative">
                {(group as any[]).map((match: any) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tip={tipsByMatchId[match.id] ?? null}
                    slug={slug}
                    roundName={roundName}
                    pointsIfCorrect={round.points_per_correct_tip}
                  />
                ))}
                <svg viewBox="0 0 100 20" preserveAspectRatio="none"
                     className="block w-full h-5 -mt-px" aria-hidden>
                  <path d="M 8 0 L 8 10 L 92 10 L 92 0 M 50 10 L 50 20"
                        stroke="#15231B20" strokeWidth="1" fill="none" />
                </svg>
                <div className="text-center -mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-2)]
                                italic font-serif">
                  → {nextRoundName} {gi + 1}
                </div>
              </div>
            </div>
          ))
        )}

        {groups.length > 0 && (
          <div className="mt-3 p-4 border border-dashed border-[#15231B20]
                          font-serif italic text-[var(--ink-2)] text-center tracking-tight text-base leading-snug">
            {remaining === 0
              ? `All in. ${fullyLocked ? 'Sit back, watch the carnage.' : 'Now we wait for the lock.'}`
              : `${remaining} still to call. Don't sleep on it.`}
          </div>
        )}
      </section>

      {/* Lock bar + tab nav stacked at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="bg-[var(--ink)] text-[var(--paper)] px-5 pt-3.5 pb-3.5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--paper-2)]/70">
              {picked} of {total} picked
            </div>
            <div className="font-serif italic text-lg leading-tight">
              {fullyLocked
                ? 'Round locked.'
                : remaining === 0
                ? 'All in. Hands off.'
                : `${remaining} still to call.`}
            </div>
          </div>
          {!fullyLocked && remaining > 0 && nextPickHref && (
            <Link
              href={nextPickHref}
              className="bg-[var(--brick)] hover:bg-[var(--brick-dark)] text-[var(--paper)] px-4 py-3
                         text-[11px] uppercase tracking-[0.18em] font-semibold rounded-[2px]
                         transition-colors"
            >
              Next pick →
            </Link>
          )}
        </div>
        <TabBar tournamentSlug={slug} />
      </div>
    </main>
  )
}
