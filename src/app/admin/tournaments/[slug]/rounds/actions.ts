'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'

export async function updateRoundPoints(
  roundId: string,
  points: number,
  slug: string
): Promise<{ error: string } | null> {
  const authError = await requireAdmin()
  if (authError) return authError

  if (!Number.isInteger(points) || points < 0 || points > 10000) {
    return { error: 'Points must be a whole number between 0 and 10,000.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('rounds')
    .update({ points_per_correct_tip: points })
    .eq('id', roundId)

  if (error) return { error: error.message }

  // Points show on most public pages — scores are computed live, so refresh them all.
  revalidatePath(`/admin/tournaments/${slug}/rounds`)
  revalidatePath(`/tournaments/${slug}/bracket`)
  revalidatePath(`/tournaments/${slug}/picks`)
  revalidatePath(`/tournaments/${slug}/leaderboard`)
  revalidatePath(`/tournaments/${slug}/round/[name]`, 'page')
  revalidatePath('/dashboard')
  return null
}
