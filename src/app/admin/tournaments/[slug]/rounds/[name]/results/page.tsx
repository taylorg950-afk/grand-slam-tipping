import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ResultRow from './ResultRow'

export default async function ResultsPage({
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
    .select('id, player1_name, player2_name, scheduled_start, winner, score, no_points')
    .eq('round_id', round.id)
    .order('scheduled_start')

  const resulted = matches?.filter(m => m.winner).length ?? 0
  const total = matches?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/tournaments/${slug}/rounds`} className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
          ← {tournament.name}
        </Link>
        <h1 className="mt-2 font-serif text-[22px] font-bold uppercase tracking-[0.04em]">{round.name} — Results</h1>
        <p className="text-sm text-[var(--ink-3)]">{resulted}/{total} results entered</p>
      </div>

      {!matches?.length ? (
        <p className="text-sm text-[var(--ink-3)]">No matches in this round yet.</p>
      ) : (
        <div className="space-y-3">
          {matches.map(match => (
            <ResultRow key={match.id} match={match} slug={slug} roundName={roundName} />
          ))}
        </div>
      )}
    </div>
  )
}
