import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MatchCard from './MatchCard'

export default async function RoundPage({
  params,
}: {
  params: Promise<{ slug: string; name: string }>
}) {
  const { slug, name: roundName } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  const { data: round } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .eq('name', roundName)
    .single()

  if (!round) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, player1_name, player2_name, scheduled_start, winner')
    .eq('round_id', round.id)
    .order('scheduled_start')

  // Fetch this user's tips for these matches
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

  const picked = (tips ?? []).length
  const total = matches?.length ?? 0
  const resulted = matches?.filter(m => m.winner).length ?? 0

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">← Dashboard</Link>
          <span className="text-sm font-medium">{tournament.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{round.name}</h1>
            <p className="text-sm text-zinc-500">{round.points_per_correct_tip} pts per correct tip</p>
          </div>
          <div className="text-right text-sm text-zinc-500">
            <div>{picked}/{total} picked</div>
            {resulted > 0 && <div>{resulted} resulted</div>}
          </div>
        </div>

        {!matches?.length ? (
          <p className="text-sm text-zinc-500">No matches scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                tip={tipsByMatchId[match.id] ?? null}
                slug={slug}
                roundName={roundName}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
