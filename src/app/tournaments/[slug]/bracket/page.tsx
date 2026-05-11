import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BracketView from './BracketView'
import { TabBar } from '@/components/TabBar'

export default async function BracketPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

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

  const [{ data: matches }, { data: users }] = await Promise.all([
    supabase
      .from('matches')
      .select('id, round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at, bracket_position')
      .in('round_id', roundIds)
      .order('created_at'),
    supabase.from('users').select('id, display_name').order('display_name'),
  ])

  const { data: { user } } = await supabase.auth.getUser()

  const matchIds = (matches ?? []).map(m => m.id)

  const now = new Date()
  const lockedMatchIds = (matches ?? [])
    .filter(m => new Date(m.scheduled_start) <= now)
    .map(m => m.id)

  const [{ data: myTips }, { data: allTips }] = await Promise.all([
    matchIds.length
      ? supabase
          .from('tips')
          .select('match_id, predicted_winner')
          .eq('user_id', user!.id)
          .in('match_id', matchIds)
      : Promise.resolve({ data: [] }),
    lockedMatchIds.length
      ? supabase
          .from('tips')
          .select('match_id, predicted_winner, user_id')
          .in('match_id', lockedMatchIds)
      : Promise.resolve({ data: [] }),
  ])

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
        <span className="font-serif italic text-[18px] leading-none text-[#1B1814]">The Draw</span>
      </header>

      <main className="relative z-10 flex-1 px-5 py-5" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <BracketView
          rounds={rounds ?? []}
          matches={matches ?? []}
          myTips={myTips ?? []}
          allTips={allTips ?? []}
          users={users ?? []}
          currentUserId={user!.id}
          tournamentSlug={slug}
        />
      </main>

      <TabBar tournamentSlug={slug} />
    </div>
  )
}
