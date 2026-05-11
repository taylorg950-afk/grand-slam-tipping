'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addMatch(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()

  const round_id         = formData.get('round_id') as string
  const player1_name     = (formData.get('player1_name') as string).trim()
  const player2_name     = (formData.get('player2_name') as string).trim()
  const draw             = formData.get('draw') as string
  const scheduled_start  = formData.get('scheduled_start') as string
  const slug             = formData.get('slug') as string
  const roundName        = formData.get('round_name') as string
  const bracketPosRaw    = formData.get('bracket_position') as string
  const bracket_position = bracketPosRaw !== '' ? parseInt(bracketPosRaw, 10) : null

  if (!player1_name || !player2_name || !draw || !scheduled_start) {
    return { error: 'All fields are required.' }
  }

  if (player1_name.toLowerCase() === player2_name.toLowerCase()) {
    return { error: 'Player 1 and Player 2 must be different.' }
  }

  const { error } = await supabase.from('matches').insert({
    round_id,
    player1_name,
    player2_name,
    draw,
    scheduled_start: new Date(scheduled_start + 'Z').toISOString(),
    bracket_position: isNaN(bracket_position as number) ? null : bracket_position,
  })

  if (error) return { error: error.message }

  revalidatePath(`/admin/tournaments/${slug}/rounds/${roundName}/matches`)
  return null
}

export async function deleteMatch(matchId: string, slug: string, roundName: string) {
  const supabase = await createClient()
  await supabase.from('matches').delete().eq('id', matchId)
  revalidatePath(`/admin/tournaments/${slug}/rounds/${roundName}/matches`)
}
