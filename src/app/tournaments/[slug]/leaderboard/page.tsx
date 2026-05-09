import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { computeScores } from '@/lib/scoring'

export default async function LeaderboardPage({
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
      .select('id, round_id, winner')
      .in('round_id', roundIds),
    supabase
      .from('users')
      .select('id, display_name')
      .order('display_name'),
  ])

  const matchIds = (matches ?? []).map(m => m.id)

  const { data: tips } = matchIds.length
    ? await supabase.from('tips').select('user_id, match_id, predicted_winner').in('match_id', matchIds)
    : { data: [] }

  const scores = computeScores(users ?? [], matches ?? [], rounds ?? [], tips ?? [])
  const resulted = (matches ?? []).filter(m => m.winner).length

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
          <h1 className="text-xl font-semibold">Leaderboard</h1>
          <p className="text-sm text-zinc-500">{resulted} results in</p>
        </div>

        {!resulted ? (
          <p className="text-sm text-zinc-500">No results entered yet — leaderboard will appear once matches have been played.</p>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
            {scores.map((user, i) => {
              const rank = i + 1
              return (
                <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                  <span className={`w-6 text-sm font-semibold tabular-nums ${rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-zinc-400' : rank === 3 ? 'text-amber-600' : 'text-zinc-300'}`}>
                    {rank}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.display_name}</p>
                    <p className="text-xs text-zinc-400">{user.correctTips}/{user.totalTips} correct</p>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">{user.totalPoints}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Rounds</p>
          <div className="flex flex-wrap gap-2">
            {rounds?.map(r => (
              <Link
                key={r.id}
                href={`/tournaments/${slug}/round/${r.name}`}
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-400"
              >
                {r.name}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
