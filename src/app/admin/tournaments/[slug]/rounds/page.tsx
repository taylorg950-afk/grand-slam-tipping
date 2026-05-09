import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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

      <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {rounds?.map((round) => (
          <div key={round.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="text-sm font-medium">{round.name}</span>
              <span className="ml-2 text-xs text-zinc-400">{round.points_per_correct_tip} pts per correct tip</span>
            </div>
            <Link
              href={`/admin/tournaments/${slug}/rounds/${round.name}/matches`}
              className="text-sm text-zinc-500 hover:text-zinc-900"
            >
              Manage matches →
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
