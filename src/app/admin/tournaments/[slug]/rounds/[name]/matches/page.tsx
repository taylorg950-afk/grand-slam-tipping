import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AddMatchForm from './AddMatchForm'
import GenerateMatchesForm from './GenerateMatchesForm'
import { deleteMatch } from './actions'
import { AEST_TZ, AEST_LABEL } from '@/lib/time'

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
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .eq('name', roundName)
    .single()

  if (!round) notFound()

  const { data: allRounds } = await supabase
    .from('rounds')
    .select('id, name, sort_order')
    .eq('tournament_id', tournament.id)
    .order('sort_order')

  const prevRound = (allRounds ?? []).find(r => r.sort_order === round.sort_order - 1) ?? null

  const { data: matches } = await supabase
    .from('matches')
    .select('id, player1_name, player2_name, draw, scheduled_start, winner')
    .eq('round_id', round.id)
    .order('scheduled_start')

  const now = new Date()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/tournaments/${slug}/rounds`} className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
          ← {tournament.name}
        </Link>
        <h1 className="mt-2 font-serif text-[22px] font-bold uppercase tracking-[0.04em]">{round.name}</h1>
        <p className="text-sm text-[var(--ink-3)]">{round.points_per_correct_tip} pts per correct tip</p>
      </div>

      {prevRound && (
        <GenerateMatchesForm
          roundId={round.id}
          roundName={roundName}
          prevRoundName={prevRound.name}
          slug={slug}
        />
      )}

      <AddMatchForm roundId={round.id} roundName={roundName} slug={slug} />

      {!matches?.length ? (
        <p className="text-sm text-[var(--ink-3)]">No matches yet.</p>
      ) : (
        <div className="divide-y divide-[var(--rule)] rounded-lg border border-[var(--rule)] bg-white">
          {matches.map((match) => {
            const locked = new Date(match.scheduled_start) <= now
            return (
              <div key={match.id} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {match.player1_name} <span className="font-normal text-[var(--ink-3)]">vs</span> {match.player2_name}
                    </span>
                    <span className="rounded-full bg-[var(--paper-3)] px-2 py-0.5 text-xs text-[var(--ink-3)] capitalize">
                      {match.draw === 'mens' ? "Men's" : "Women's"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--ink-3)]">
                    <span>{new Date(match.scheduled_start).toLocaleString('en-AU', { timeZone: AEST_TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: false })} {AEST_LABEL}</span>
                    {locked ? (
                      <span className="text-[var(--down)] font-medium">Locked</span>
                    ) : (
                      <span className="text-[var(--olive)] font-medium">Open</span>
                    )}
                    {match.winner && (
                      <span className="text-[var(--ink-2)]">
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
                    <button type="submit" className="text-xs text-[var(--down)] hover:text-[var(--down)]">
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
