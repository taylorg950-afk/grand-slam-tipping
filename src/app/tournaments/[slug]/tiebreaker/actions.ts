'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveTiebreaker(
  _prevState: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const tournament_id = formData.get('tournament_id') as string
  const slug = formData.get('slug') as string
  const mensRaw = formData.get('mens_final_total_games') as string
  const womensRaw = formData.get('womens_final_total_games') as string

  const mens = mensRaw !== '' ? parseInt(mensRaw, 10) : null
  const womens = womensRaw !== '' ? parseInt(womensRaw, 10) : null

  if (mens !== null && (isNaN(mens) || mens < 1 || mens > 200)) {
    return { error: "Enter a valid game count for the men's final (1–200)." }
  }
  if (womens !== null && (isNaN(womens) || womens < 1 || womens > 200)) {
    return { error: "Enter a valid game count for the women's final (1–200)." }
  }

  const { error } = await supabase.from('tiebreakers').upsert(
    { user_id: user.id, tournament_id, mens_final_total_games: mens, womens_final_total_games: womens },
    { onConflict: 'user_id,tournament_id' }
  )

  if (error) return { error: error.message }

  revalidatePath(`/tournaments/${slug}/tiebreaker`)
  return { ok: true }
}
