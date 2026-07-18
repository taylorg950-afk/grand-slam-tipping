'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'

export async function setResult(
  matchId: string,
  winner: 'player1' | 'player2' | null,
  slug: string,
  roundName: string
): Promise<{ error: string } | null> {
  const authError = await requireAdmin()
  if (authError) return authError
  const supabase = await createClient()

  const { error } = await supabase
    .from('matches')
    .update({ winner })
    .eq('id', matchId)

  if (error) return { error: error.message }

  // Advance winner into the next round's match
  await advanceBracket(supabase, matchId, winner)

  revalidateResultPages(slug, roundName)
  return null
}

// Score line and the no-points (walkover) flag, saved independently of the winner.
export async function setMatchExtras(
  matchId: string,
  extras: { score?: string | null; noPoints?: boolean },
  slug: string,
  roundName: string
): Promise<{ error: string } | null> {
  const authError = await requireAdmin()
  if (authError) return authError
  const supabase = await createClient()

  const update: Record<string, string | boolean | null> = {}
  if ('score' in extras) update.score = extras.score?.trim() || null
  if ('noPoints' in extras) update.no_points = !!extras.noPoints

  const { error } = await supabase
    .from('matches')
    .update(update)
    .eq('id', matchId)

  if (error) return { error: error.message }

  revalidateResultPages(slug, roundName)
  return null
}

function revalidateResultPages(slug: string, roundName: string) {
  revalidatePath(`/admin/tournaments/${slug}/rounds/${roundName}/results`)
  revalidatePath(`/tournaments/${slug}/round/${roundName}`)
  revalidatePath(`/tournaments/${slug}/bracket`)
  revalidatePath(`/tournaments/${slug}/picks`)
  revalidatePath(`/tournaments/${slug}/leaderboard`)
  revalidatePath('/dashboard')
}

async function advanceBracket(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  matchId: string,
  winner: 'player1' | 'player2' | null
) {
  // Fetch the match and its round
  const { data: match } = await supabase
    .from('matches')
    .select('player1_name, player2_name, bracket_position, round_id, draw')
    .eq('id', matchId)
    .single()

  if (!match || match.bracket_position === null) return

  const { data: round } = await supabase
    .from('rounds')
    .select('sort_order, tournament_id')
    .eq('id', match.round_id)
    .single()

  if (!round) return

  // Find the next round by sort_order
  const { data: nextRound } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', round.tournament_id)
    .eq('sort_order', round.sort_order + 1)
    .single()

  if (!nextRound) return

  // Calculate which match in the next round this feeds into
  const nextPosition = Math.floor(match.bracket_position / 2)
  const slot = match.bracket_position % 2 === 0 ? 'player1_name' : 'player2_name'

  const { data: nextMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('round_id', nextRound.id)
    .eq('bracket_position', nextPosition)
    .eq('draw', match.draw)
    .single()

  if (!nextMatch) return

  const winnerName = winner === null
    ? 'TBD'
    : winner === 'player1'
    ? match.player1_name
    : match.player2_name

  await supabase
    .from('matches')
    .update({ [slot]: winnerName })
    .eq('id', nextMatch.id)
}
