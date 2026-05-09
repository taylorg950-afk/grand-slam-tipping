import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddMatchForm from './AddMatchForm'
import { deleteMatch } from './actions'

export default async function RoundMatchesPage({
  params,
}: {
  params: Promise<{ slug: string; name: string }>
}) {
  const { slug, name: roundName } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  const { data: round } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip')
    .eq('tournament_id', tournament.id)
    .eq('name', roundName)
    .single()

  if (!round) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, player1_name, player2_name, draw, scheduled_start, winner')
    .eq('round_id', round.id)
    .order('scheduled_start')

  const now = new Date()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/tournaments/${slug}/rounds`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {tournament.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{round.name}</h1>
        <p className="text-sm text-zinc-500">{round.points_per_correct_tip} pts per correct tip</p>
      </div>

      <AddMatchForm roundId={round.id} roundName={roundName} slug={slug} />

      {!matches?.length ? (
        <p className="text-sm text-zinc-500">No matches yet.</p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {matches.map((match) => {
            const locked = new Date(match.scheduled_start) <= now
            return (
              <div key={match.id} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {match.player1_name} <span className="font-normal text-zinc-400">vs</span> {match.player2_name}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 capitalize">
                      {match.draw === 'mens' ? "Men's" : "Women's"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{new Date(match.scheduled_start).toUTCString().replace(' GMT', ' UTC')}</span>
                    {locked ? (
                      <span className="text-amber-600 font-medium">Locked</span>
                    ) : (
                      <span className="text-green-600 font-medium">Open</span>
                    )}
                    {match.winner && (
                      <span className="text-zinc-600">
                        Winner: {match.winner === 'player1' ? match.player1_name : match.player2_name}
                      </span>
                    )}
                  </div>
                </div>
                {!locked && (
                  <form
                    action={async () => {
                      'use server'
                      await deleteMatch(match.id, slug, roundName)
                    }}
                  >
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
