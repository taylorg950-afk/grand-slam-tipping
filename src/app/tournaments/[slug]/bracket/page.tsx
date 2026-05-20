import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import BracketView from './BracketView'

export default async function BracketPage({
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

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .order('sort_order')

  const roundIds = (rounds ?? []).map(r => r.id)

  const { data: matches } = await supabase
    .from('matches')
    .select('id, round_id, player1_name, player2_name, scheduled_start, winner, draw, created_at, bracket_position')
    .in('round_id', roundIds)
    .order('created_at')

  const matchIds = (matches ?? []).map(m => m.id)

  const { data: myTips } = matchIds.length
    ? await supabase
        .from('tips')
        .select('match_id, predicted_winner')
        .eq('user_id', user.id)
        .in('match_id', matchIds)
    : { data: [] }

  return (
    <BracketView
      tournament={{ name: tournament.name, slug: tournament.slug }}
      rounds={rounds ?? []}
      matches={matches ?? []}
      myTips={myTips ?? []}
    />
  )
}
