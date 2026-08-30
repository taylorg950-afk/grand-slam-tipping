import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PicksView, { type PicksMatch, type PicksRound, type RoomCount } from './PicksView'

export default async function MyPicksPage({
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
  const rounds: PicksRound[] = roundData ?? []

  const roundIds = rounds.map(r => r.id)

  const { data: matchData } = roundIds.length
    ? await supabase
        .from('matches')
        .select('id, round_id, player1_name, player2_name, scheduled_start, winner, score, no_points, draw')
        .in('round_id', roundIds)
        .order('scheduled_start', { ascending: true })
    : { data: [] as PicksMatch[] }
  const matches: PicksMatch[] = matchData ?? []
  const matchIds = matches.map(m => m.id)

  const { data: tipData } = matchIds.length
    ? await supabase
        .from('tips')
        .select('match_id, predicted_winner')
        .eq('user_id', user.id)
        .in('match_id', matchIds)
    : { data: [] }
  const tipMap = Object.fromEntries((tipData ?? []).map(t => [t.match_id, t.predicted_winner]))

  // How the room split, for locked matches only. Rule II: until a tie locks
  // your picks are your own. Counting server-side and sending nothing for an
  // open match means an early split isn't sitting in the payload to be read.
  const now = new Date()
  const lockedIds = matches.filter(m => new Date(m.scheduled_start) <= now).map(m => m.id)

  const roomCounts: Record<string, RoomCount> = {}
  if (lockedIds.length) {
    const PAGE = 1000
    const rows: { match_id: string; predicted_winner: string }[] = []
    for (let from = 0; ; from += PAGE) {
      const { data } = await supabase
        .from('tips')
        .select('match_id, predicted_winner')
        .in('match_id', lockedIds)
        .range(from, from + PAGE - 1)
      if (!data?.length) break
      rows.push(...data)
      if (data.length < PAGE) break
    }
    for (const id of lockedIds) roomCounts[id] = { player1: 0, player2: 0 }
    for (const r of rows) {
      const c = roomCounts[r.match_id]
      if (!c) continue
      if (r.predicted_winner === 'player1') c.player1++
      else if (r.predicted_winner === 'player2') c.player2++
    }
  }

  return (
    <PicksView
      tournament={{ name: tournament.name, slug: tournament.slug }}
      rounds={rounds}
      matches={matches}
      tipMap={tipMap}
      roomCounts={roomCounts}
    />
  )
}
