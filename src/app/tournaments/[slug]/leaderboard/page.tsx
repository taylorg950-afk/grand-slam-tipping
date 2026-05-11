import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { computeScores } from '@/lib/scoring'
import { TabBar } from '@/components/TabBar'

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

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
    supabase.from('matches').select('id, round_id, winner').in('round_id', roundIds),
    supabase.from('users').select('id, display_name').order('display_name'),
  ])

  const matchIds = (matches ?? []).map(m => m.id)

  const { data: tips } = matchIds.length
    ? await supabase.from('tips').select('user_id, match_id, predicted_winner').in('match_id', matchIds)
    : { data: [] }

  const scores = computeScores(users ?? [], matches ?? [], rounds ?? [], tips ?? [])
  const resulted = (matches ?? []).filter(m => m.winner).length
  const myRank = scores.findIndex(s => s.id === user!.id) + 1

  return (
    <main className="min-h-screen flex flex-col bg-[#FAF6EC] text-[#1B1814] relative">
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1B1814 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      {/* Masthead */}
      <header className="relative z-10 px-5 py-3.5 flex items-baseline justify-between border-b border-[#1B181420]">
        <div className="font-serif italic text-[22px] leading-none tracking-tight">
          The Tipping Post
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#3C342C]">
          {tournament.name}
        </div>
      </header>

      {/* Clay banner */}
      <section className="relative z-10 px-5 py-4 overflow-hidden text-[#FAF6EC]"
               style={{ background: 'linear-gradient(180deg, #B85433 0%, #8E3A1F 100%)' }}>
        <div aria-hidden className="absolute -right-8 -top-3 text-[140px] leading-none italic
                                    font-serif text-white/[0.06] select-none pointer-events-none">
          {tournament.slug?.split('-')[0]?.toUpperCase() ?? 'GS'}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1">
          Full standings
        </div>
        <h1 className="font-serif text-3xl leading-[1.05] tracking-tight">
          The Standings
          <br />
          <span className="italic text-[#F2EBDC] text-2xl">
            {resulted} {resulted === 1 ? 'result' : 'results'} in.
          </span>
        </h1>
        {myRank > 0 && (
          <div className="mt-3 text-xs text-white/85">
            You&apos;re <b className="text-white font-semibold">{myRank}{ordinal(myRank)}</b> of {scores.length}
          </div>
        )}
      </section>

      {/* Standings table */}
      <section className="relative z-10 px-5 pt-5 pb-4 flex-1">
        {!resulted ? (
          <div className="font-serif italic text-[#3C342C] text-lg py-8 text-center">
            No results yet. Wait till matches are played.
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div className="grid grid-cols-[22px_1fr_auto_44px] gap-2.5 pb-2 mb-1
                            border-b-2 border-[#1B1814]
                            text-[9px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
              <div>#</div>
              <div>Player</div>
              <div className="text-right">Correct</div>
              <div className="text-right">Pts</div>
            </div>

            {scores.map((s, i) => {
              const isMe = s.id === user!.id
              const isLast = i === scores.length - 1
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              return (
                <div
                  key={s.id}
                  className={`grid grid-cols-[22px_1fr_auto_44px] gap-2.5 py-2.5 items-baseline text-[13px]
                              ${isMe ? 'text-[#B85433] font-semibold' : 'text-[#1B1814]'}
                              ${isLast ? '' : 'border-b border-dotted border-[#1B181420]'}`}
                >
                  <div className={`font-serif text-base italic ${isMe ? 'text-[#B85433]' : 'text-[#3C342C]'}`}>
                    {medal ?? (i + 1)}
                  </div>
                  <div className="truncate">
                    {s.display_name}
                    {isMe && <span className="italic font-normal text-[#3C342C]"> · you</span>}
                  </div>
                  <div className="text-right tabular-nums text-[#3C342C]">
                    {s.correctTips}/{s.totalTips}
                  </div>
                  <div className={`text-right font-serif text-lg tabular-nums ${isMe ? 'text-[#B85433]' : 'text-[#1B1814]'}`}>
                    {s.totalPoints}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Round links */}
        {(rounds?.length ?? 0) > 0 && (
          <div className="mt-8 pt-4 border-t border-dotted border-[#1B181420]">
            <div className="text-[9px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold mb-3">
              Browse by round
            </div>
            <div className="flex flex-wrap gap-2">
              {rounds?.map(r => (
                <Link
                  key={r.id}
                  href={`/tournaments/${slug}/round/${r.name}`}
                  className="text-[11px] uppercase tracking-[0.12em] px-3 py-1.5 rounded-[2px]
                             border border-[#1B181430] text-[#3C342C]
                             hover:border-[#1B1814] hover:text-[#1B1814] transition-colors"
                >
                  {r.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <TabBar tournamentSlug={slug} />
    </main>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}
