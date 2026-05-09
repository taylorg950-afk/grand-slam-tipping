'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setResult(
  matchId: string,
  winner: 'player1' | 'player2' | null,
  slug: string,
  roundName: string
): Promise<{ error: string } | null> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('matches')
    .update({ winner })
    .eq('id', matchId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/tournaments/${slug}/rounds/${roundName}/results`)
  revalidatePath(`/tournaments/${slug}/round/${roundName}`)
  return null
}
