import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/TabBar'
import PicksView from './PicksView'

export default async function MyPicksPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .order('sort_order')

  const roundIds = (rounds ?? []).map(r => r.id)

  const { data: matches } = roundIds.length
    ? await supabase
        .from('matches')
        .select('id, round_id, player1_name, player2_name, scheduled_start, winner, draw')
        .in('round_id', roundIds)
        .order('bracket_position', { ascending: true, nullsFirst: false })
    : { data: [] }

  const matchIds = (matches ?? []).map(m => m.id)

  const { data: tips } = matchIds.length && user
    ? await supabase
        .from('tips')
        .select('match_id, predicted_winner')
        .eq('user_id', user.id)
        .in('match_id', matchIds)
    : { data: [] }

  const tipMap = Object.fromEntries((tips ?? []).map(t => [t.match_id, t.predicted_winner]))
  const pointsMap = Object.fromEntries((rounds ?? []).map(r => [r.id, r.points_per_correct_tip]))

  let totalPicked = 0
  let totalCorrect = 0
  let totalPoints = 0

  for (const m of (matches ?? [])) {
    const tip = tipMap[m.id]
    if (!tip) continue
    totalPicked++
    if (m.winner && tip === m.winner) {
      totalCorrect++
      totalPoints += pointsMap[m.round_id] ?? 0
    }
  }

  const grouped = (rounds ?? []).map(round => ({
    round,
    matches: (matches ?? []).filter(m => m.round_id === round.id),
  })).filter(g => g.matches.length > 0)

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EC] text-[#1B1814] relative">
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1B1814 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      <header className="relative z-10 border-b border-[#1B181420] px-5 py-3.5 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-3 text-[#3C342C]">
          <span className="text-lg leading-none">‹</span>
          <span className="text-[10px] uppercase tracking-[0.18em]">{tournament.name}</span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#1B181430]">·</span>
        <span className="font-serif italic text-[18px] leading-none">My Picks</span>
      </header>

      <section className="relative z-10 px-5 py-5 overflow-hidden text-[#FAF6EC]"
               style={{ background: 'linear-gradient(180deg, #B85433 0%, #8E3A1F 100%)' }}>
        <div aria-hidden className="absolute -right-8 -top-3 text-[140px] leading-none italic
                                    font-serif text-white/[0.06] select-none pointer-events-none">
          {tournament.slug?.split('-')[0]?.toUpperCase() ?? 'GS'}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1">Your scorecard</div>
        <h1 className="font-serif text-3xl leading-[1.05] tracking-tight">
          My Picks
          <br />
          <span className="italic text-[#F2EBDC] text-2xl">
            {totalPicked === 0 ? 'No picks yet.' : `${totalCorrect} of ${totalPicked} correct.`}
          </span>
        </h1>
        {totalPicked > 0 && (
          <div className="mt-3 flex gap-5 text-xs text-white/85">
            <span><b className="text-white font-semibold">{totalPoints}</b> pts earned</span>
            <span><b className="text-white font-semibold">{totalPicked - totalCorrect}</b> wrong</span>
            <span><b className="text-white font-semibold">{(matches ?? []).length - totalPicked}</b> unpicked</span>
          </div>
        )}
      </section>

      <main className="relative z-10 flex-1 px-5 pt-5 pb-8">
        <PicksView grouped={grouped} tipMap={tipMap} slug={slug} />
      </main>

      <TabBar tournamentSlug={slug} />
    </div>
  )
}
