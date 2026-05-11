'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setActiveTournament(tournamentId: string) {
  const supabase = await createClient()

  // Deactivate all, then activate the chosen one
  await supabase.from('tournaments').update({ is_active: false }).neq('id', tournamentId)
  await supabase.from('tournaments').update({ is_active: true }).eq('id', tournamentId)

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function deactivateAllTournaments() {
  const supabase = await createClient()
  await supabase.from('tournaments').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}
