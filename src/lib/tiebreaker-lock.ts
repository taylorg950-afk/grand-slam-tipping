import type { createClient } from '@/lib/supabase/server'

type Client = Awaited<ReturnType<typeof createClient>>

export interface TiebreakerLock {
  /** Start of the earliest final on the books, men's or women's. Null until a final is entered. */
  lockAt: string | null
  /** Which final that is, so the copy can name it. */
  lockDraw: 'mens' | 'womens' | null
  locked: boolean
}

/**
 * The tiebreaker locks at the first serve of whichever singles final starts
 * first. The comp tips the men's draw only, but if the women's final is
 * entered and goes on court earlier (it usually does), it locks the tiebreaker
 * too — nobody gets to watch a final before filing a number.
 *
 * The database enforces the same rule (migration 0005), so this is for the
 * page and a friendly error, not the only guard.
 */
export async function getTiebreakerLock(
  supabase: Client,
  tournamentId: string,
  now: Date = new Date(),
): Promise<TiebreakerLock> {
  const { data: finalRound } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('name', 'F')
    .maybeSingle()
  if (!finalRound) return { lockAt: null, lockDraw: null, locked: false }

  const { data: finals } = await supabase
    .from('matches')
    .select('scheduled_start, draw')
    .eq('round_id', finalRound.id)
    .not('scheduled_start', 'is', null)
    .order('scheduled_start', { ascending: true })
    .limit(1)

  const first = finals?.[0]
  if (!first) return { lockAt: null, lockDraw: null, locked: false }

  return {
    lockAt: first.scheduled_start,
    lockDraw: first.draw === 'womens' ? 'womens' : 'mens',
    locked: new Date(first.scheduled_start) <= now,
  }
}

export function finalLabel(draw: 'mens' | 'womens' | null): string {
  if (draw === 'womens') return "women's final"
  if (draw === 'mens') return "men's final"
  return 'first final'
}
