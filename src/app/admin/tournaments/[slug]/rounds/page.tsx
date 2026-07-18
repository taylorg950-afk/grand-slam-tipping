import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoundPointsForm from './RoundPointsForm'

export default async function TournamentRoundsPage({
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

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">← Admin</Link>
        <h1 className="mt-2 text-xl font-semibold">{tournament.name}</h1>
        <p className="text-sm text-zinc-500">Rounds</p>
      </div>

      <div className="flex justify-end">
        <Link
          href={`/admin/tournaments/${slug}/import-draw`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Import draw from PDF
        </Link>
      </div>

      <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {rounds?.map((round) => (
          <div key={round.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="text-sm font-medium">{round.name}</span>
              <RoundPointsForm roundId={round.id} slug={slug} initialPoints={round.points_per_correct_tip} />
            </div>
            <div className="flex gap-4 text-sm">
              <Link href={`/admin/tournaments/${slug}/rounds/${round.name}/matches`} className="text-zinc-500 hover:text-zinc-900">
                Matches
              </Link>
              <Link href={`/admin/tournaments/${slug}/rounds/${round.name}/results`} className="text-zinc-500 hover:text-zinc-900">
                Results
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
