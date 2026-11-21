'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTiebreakerLock, finalLabel } from '@/lib/tiebreaker-lock'

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

  // Enforce the lock server-side — the form disables itself client-side, and
  // the database refuses late writes too (migration 0005); this just turns
  // that into a readable message.
  const lock = await getTiebreakerLock(supabase, tournament_id)
  if (lock.locked) {
    return { error: `The tiebreaker is locked — the ${finalLabel(lock.lockDraw)} has started.` }
  }

  const mens = mensRaw !== '' ? parseInt(mensRaw, 10) : null

  if (mens !== null && (isNaN(mens) || mens < 1 || mens > 200)) {
    return { error: "Enter a valid game count for the final (1–200)." }
  }

  const { error } = await supabase.from('tiebreakers').upsert(
    { user_id: user.id, tournament_id, mens_final_total_games: mens },
    { onConflict: 'user_id,tournament_id' }
  )

  if (error) {
    // 42501 = row-level security refused the write: a final went on court
    // between the check above and the save.
    if (error.code === '42501') return { error: 'The tiebreaker is locked — a final has started.' }
    return { error: error.message }
  }

  revalidatePath(`/tournaments/${slug}/tiebreaker`)
  return { ok: true }
}
