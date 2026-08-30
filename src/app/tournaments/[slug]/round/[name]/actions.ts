'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitTip(
  slug: string,
  roundName: string,
  matchId: string,
  predictedWinner: 'player1' | 'player2'
): Promise<{ error: string } | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  // Server-side lock check
  const { data: match } = await supabase
    .from('matches')
    .select('scheduled_start, player1_name, player2_name, round_id')
    .eq('id', matchId)
    .single()

  if (!match) return { error: 'Match not found.' }

  // A round worth 0 points is in the draw for the bracket but isn't tipped.
  // The UI hides it either way; this stops a crafted request storing a tip
  // that could never score.
  const { data: round } = await supabase
    .from('rounds')
    .select('points_per_correct_tip')
    .eq('id', match.round_id)
    .single()
  if (round && round.points_per_correct_tip <= 0) {
    return { error: "This round isn't tipped." }
  }
  if (new Date(match.scheduled_start) <= new Date()) return { error: 'This match has already locked.' }

  // No tipping an empty slot — future-round matches hold 'TBD' until the bracket advances
  const pickedName = predictedWinner === 'player1' ? match.player1_name : match.player2_name
  if (!pickedName || pickedName.trim().toUpperCase() === 'TBD') {
    return { error: "That spot hasn't been decided yet." }
  }

  const { error } = await supabase.from('tips').upsert(
    {
      user_id: user.id,
      match_id: matchId,
      predicted_winner: predictedWinner,
    },
    { onConflict: 'user_id,match_id' }
  )

  if (error) return { error: error.message }

  revalidatePath(`/tournaments/${slug}/round/${roundName}`)
  revalidatePath(`/tournaments/${slug}/bracket`)
  revalidatePath(`/tournaments/${slug}/picks`)
  return null
}
