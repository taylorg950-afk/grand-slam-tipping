'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/require-admin'

const SLAM_ROUNDS = [
  { name: 'R64', points_per_correct_tip: 2,  sort_order: 1 },
  { name: 'R32', points_per_correct_tip: 4,  sort_order: 2 },
  { name: 'R16', points_per_correct_tip: 8,  sort_order: 3 },
  { name: 'QF',  points_per_correct_tip: 16, sort_order: 4 },
  { name: 'SF',  points_per_correct_tip: 32, sort_order: 5 },
  { name: 'F',   points_per_correct_tip: 64, sort_order: 6 },
]

export async function createTournament(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const authError = await requireAdmin()
  if (authError) return authError
  const supabase = await createClient()

  const name       = (formData.get('name') as string).trim()
  const slug       = (formData.get('slug') as string).trim()
  const start_date = formData.get('start_date') as string
  const end_date   = formData.get('end_date') as string
  const set_active = formData.get('set_active') === 'on'

  if (!name || !slug || !start_date || !end_date) {
    return { error: 'All fields are required.' }
  }

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({ name, slug, start_date, end_date, is_active: set_active })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('tournaments_slug_key')) {
      return { error: 'That slug is already taken — choose a different one.' }
    }
    if (error.message.includes('tournaments_one_active')) {
      return { error: 'There is already an active tournament. Deactivate it first.' }
    }
    return { error: error.message }
  }

  await supabase.from('rounds').insert(
    SLAM_ROUNDS.map(r => ({ ...r, tournament_id: tournament.id }))
  )

  redirect('/admin')
}
