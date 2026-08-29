'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'

export async function addMatch(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const authError = await requireAdmin()
  if (authError) return authError
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
    // Form input is AEST wall-clock time (fixed UTC+10, no DST).
    scheduled_start: new Date(scheduled_start + '+10:00').toISOString(),
    bracket_position: isNaN(bracket_position as number) ? null : bracket_position,
  })

  if (error) return { error: error.message }

  revalidatePath(`/admin/tournaments/${slug}/rounds/${roundName}/matches`)
  return null
}

export async function deleteMatch(matchId: string, slug: string, roundName: string) {
  if (await requireAdmin()) return
  const supabase = await createClient()
  await supabase.from('matches').delete().eq('id', matchId)
  revalidatePath(`/admin/tournaments/${slug}/rounds/${roundName}/matches`)
}

export async function generateFromPreviousRound(
  _prevState: { error: string; created: number; updated: number } | null,
  formData: FormData
): Promise<{ error: string; created: number; updated: number }> {
  const authError = await requireAdmin()
  if (authError) return { error: 'Not authorised.', created: 0, updated: 0 }

  const supabase = await createClient()
  const roundId        = formData.get('round_id') as string
  const slug           = formData.get('slug') as string
  const roundName      = formData.get('round_name') as string
  const scheduledStart = formData.get('scheduled_start') as string

  const { data: round } = await supabase
    .from('rounds')
    .select('sort_order, tournament_id')
    .eq('id', roundId)
    .single()

  if (!round) return { error: 'Round not found.', created: 0, updated: 0 }

  const { data: prevRound } = await supabase
    .from('rounds')
    .select('id, name')
    .eq('tournament_id', round.tournament_id)
    .eq('sort_order', round.sort_order - 1)
    .single()

  if (!prevRound) return { error: 'No previous round found.', created: 0, updated: 0 }

  const { data: prevMatches } = await supabase
    .from('matches')
    .select('player1_name, player2_name, winner, bracket_position, draw')
    .eq('round_id', prevRound.id)
    .not('bracket_position', 'is', null)
    .order('bracket_position')

  if (!prevMatches?.length) return { error: `No matches with bracket positions found in ${prevRound.name}.`, created: 0, updated: 0 }

  // Form input is AEST wall-clock time (fixed UTC+10, no DST).
  const scheduledStartISO = new Date(scheduledStart + ':00+10:00').toISOString()
  const draws = [...new Set(prevMatches.map(m => m.draw))]
  let created = 0
  let updated = 0

  // One lookup of the target round's existing matches, then one batched insert
  // for the new ones — the old per-position select/insert was 30+ round trips.
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id, draw, bracket_position')
    .eq('round_id', roundId)
  const existingByKey = new Map(
    (existingMatches ?? []).map(m => [`${m.draw}:${m.bracket_position}`, m.id])
  )

  const toInsert: {
    round_id: string
    player1_name: string
    player2_name: string
    draw: string
    scheduled_start: string
    bracket_position: number
  }[] = []

  for (const draw of draws) {
    const drawMatches = prevMatches
      .filter(m => m.draw === draw)
      .sort((a, b) => a.bracket_position - b.bracket_position)

    const nextPositions = [...new Set(drawMatches.map(m => Math.floor(m.bracket_position / 2)))]

    for (const nextPos of nextPositions) {
      const p1Match = drawMatches.find(m => m.bracket_position === nextPos * 2)
      const p2Match = drawMatches.find(m => m.bracket_position === nextPos * 2 + 1)

      const p1Name = p1Match?.winner
        ? (p1Match.winner === 'player1' ? p1Match.player1_name : p1Match.player2_name)
        : 'TBD'
      const p2Name = p2Match?.winner
        ? (p2Match.winner === 'player1' ? p2Match.player1_name : p2Match.player2_name)
        : 'TBD'

      const existingId = existingByKey.get(`${draw}:${nextPos}`)
      if (existingId) {
        await supabase
          .from('matches')
          .update({ player1_name: p1Name, player2_name: p2Name })
          .eq('id', existingId)
        updated++
      } else {
        toInsert.push({
          round_id: roundId,
          player1_name: p1Name,
          player2_name: p2Name,
          draw,
          scheduled_start: scheduledStartISO,
          bracket_position: nextPos,
        })
      }
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('matches').insert(toInsert)
    if (error) return { error: error.message, created, updated }
    created = toInsert.length
  }

  revalidatePath(`/admin/tournaments/${slug}/rounds/${roundName}/matches`)
  return { error: '', created, updated }
}
