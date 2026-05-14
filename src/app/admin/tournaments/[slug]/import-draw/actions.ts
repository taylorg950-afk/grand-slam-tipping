'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'

export interface ParsedMatch {
  position: number
  player1: string
  player2: string
}

export interface ParsedRound {
  name: string
  matches: ParsedMatch[]
}

export interface ParsedDraw {
  draw: 'mens' | 'womens'
  rounds: ParsedRound[]
}

const ROUND_SORT: Record<string, number> = { R128: 0, R64: 1, R32: 2, R16: 3, QF: 4, SF: 5, F: 6 }
const ROUND_POINTS: Record<string, number> = { R128: 1, R64: 2, R32: 4, R16: 8, QF: 16, SF: 32, F: 64 }

export async function parseDrawPdf(
  formData: FormData
): Promise<{ ok: true; data: ParsedDraw } | { ok: false; error: string }> {
  const authError = await requireAdmin()
  if (authError) return { ok: false, error: authError.error }
  const file = formData.get('pdf') as File | null
  if (!file) return { ok: false, error: 'No file selected.' }
  if (file.type !== 'application/pdf') return { ok: false, error: 'File must be a PDF.' }
  if (file.size > 20 * 1024 * 1024) return { ok: false, error: 'PDF must be under 20 MB.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let responseText = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as never,
            {
              type: 'text',
              text: `This is a tennis tournament draw PDF. Extract every match that is visible.

Return ONLY valid JSON — no markdown fences, no explanation — in this exact shape:
{
  "draw": "mens",
  "rounds": [
    {
      "name": "R64",
      "matches": [
        { "position": 0, "player1": "Jannik Sinner [1]", "player2": "Qualifier" },
        { "position": 1, "player1": "Lucky Loser", "player2": "Grigor Dimitrov [10]" }
      ]
    }
  ]
}

Rules:
- "draw" must be "mens" or "womens"
- Round name must be one of: R128, R64, R32, R16, QF, SF, F
- List matches in bracket order top to bottom; "position" is 0-indexed
- Include seed in brackets if shown: "Carlos Alcaraz [2]"
- Use "TBD" for byes, qualifiers with no name, or empty slots
- Only include rounds that are actually visible in the PDF`,
            },
          ],
        },
      ],
    })

    responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const data = JSON.parse(responseText) as ParsedDraw
    return { ok: true, data }
  } catch (err) {
    const preview = responseText.slice(0, 300)
    return { ok: false, error: `Could not parse response${preview ? `: ${preview}` : '. Check your API key and try again.'}` }
  }
}

export async function saveDrawMatches(
  slug: string,
  draw: 'mens' | 'womens',
  rounds: ParsedRound[]
): Promise<{ ok: boolean; error?: string }> {
  const authError = await requireAdmin()
  if (authError) return { ok: false, error: authError.error }
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tournament) return { ok: false, error: 'Tournament not found.' }

  const { data: existingRounds } = await supabase
    .from('rounds')
    .select('id, name')
    .eq('tournament_id', tournament.id)

  const roundMap = new Map((existingRounds ?? []).map(r => [r.name, r.id]))

  // Scheduled start placeholder: 1 week from now (admin adjusts via results page later)
  const placeholder = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  for (const parsedRound of rounds) {
    let roundId = roundMap.get(parsedRound.name)

    if (!roundId) {
      const { data: newRound, error } = await supabase
        .from('rounds')
        .insert({
          tournament_id: tournament.id,
          name: parsedRound.name,
          points_per_correct_tip: ROUND_POINTS[parsedRound.name] ?? 2,
          sort_order: ROUND_SORT[parsedRound.name] ?? 99,
        })
        .select('id')
        .single()
      if (error || !newRound) continue
      roundId = newRound.id
    }

    // Insert in position order so created_at reflects bracket position
    const sorted = [...parsedRound.matches].sort((a, b) => a.position - b.position)
    for (const match of sorted) {
      await supabase.from('matches').insert({
        round_id: roundId,
        player1_name: match.player1,
        player2_name: match.player2,
        scheduled_start: placeholder,
        draw,
        winner: null,
        bracket_position: match.position,
      })
    }
  }

  revalidatePath(`/admin/tournaments/${slug}/rounds`)
  return { ok: true }
}
