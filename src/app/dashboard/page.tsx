import { createClient } from '@/lib/supabase/server'
import { computeScores } from '@/lib/scoring'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: tournament }] = await Promise.all([
    supabase.from('users').select('display_name, is_admin').eq('id', user!.id).single(),
    supabase.from('tournaments').select('id, name, slug').eq('is_active', true).maybeSingle(),
  ])

  let rounds = null
  let scores = null
  let myScore = null
  let myRank = null

  if (tournament) {
    const { data: roundData } = await supabase
      .from('rounds')
      .select('id, name, points_per_correct_tip, sort_order')
      .eq('tournament_id', tournament.id)
      .order('sort_order')

    rounds = roundData

    const roundIds = (rounds ?? []).map(r => r.id)
    const { data: matches } = await supabase
      .from('matches')
      .select('id, round_id, winner')
      .in('round_id', roundIds)

    const matchIds = (matches ?? []).map(m => m.id)
    const [{ data: tips }, { data: users }] = await Promise.all([
      matchIds.length
        ? supabase.from('tips').select('user_id, match_id, predicted_winner').in('match_id', matchIds)
        : Promise.resolve({ data: [] }),
      supabase.from('users').select('id, display_name').order('display_name'),
    ])

    scores = computeScores(users ?? [], matches ?? [], rounds ?? [], tips ?? [])
    const myIndex = scores.findIndex(s => s.id === user!.id)
    if (myIndex !== -1) {
      myScore = scores[myIndex]
      myRank = myIndex + 1
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <span className="text-sm font-medium">Grand Slam Tipping</span>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>{profile?.display_name}</span>
            {profile?.is_admin && (
              <Link href="/admin" className="text-zinc-900 font-medium hover:underline">Admin</Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {!tournament ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
            <p className="text-sm text-zinc-500">No active tournament at the moment.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">{tournament.name}</h1>
              <Link
                href={`/tournaments/${tournament.slug}/leaderboard`}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                Full leaderboard →
              </Link>
            </div>

            {myScore && (
              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">Your score</p>
                  <p className="text-2xl font-semibold tabular-nums">{myScore.totalPoints} pts</p>
                  <p className="text-xs text-zinc-400">{myScore.correctTips}/{myScore.totalTips} correct</p>
                </div>
                {myRank && (
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Rank</p>
                    <p className="text-2xl font-semibold tabular-nums">#{myRank}</p>
                    <p className="text-xs text-zinc-400">of {scores?.length}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Rounds</p>
              <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
                {rounds?.map(r => (
                  <Link
                    key={r.id}
                    href={`/tournaments/${tournament.slug}/round/${r.name}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
                  >
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-zinc-400">{r.points_per_correct_tip} pts →</span>
                  </Link>
                ))}
              </div>
            </div>

            {scores && scores.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Leaderboard</p>
                <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
                  {scores.slice(0, 5).map((s, i) => (
                    <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${s.id === user!.id ? 'bg-zinc-50' : ''}`}>
                      <span className="w-5 text-xs font-semibold tabular-nums text-zinc-400">{i + 1}</span>
                      <span className="flex-1 text-sm">{s.display_name}</span>
                      <span className="text-sm font-semibold tabular-nums">{s.totalPoints}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
