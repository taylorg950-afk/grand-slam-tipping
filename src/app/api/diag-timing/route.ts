// TEMPORARY diagnostic. (An _underscore folder is private in the App Router and
// never routes, hence the plain name.) Times, from inside the deployed function, each step the
// dashboard performs — so slowness can be attributed to a step instead of
// guessed at from the outside. Admin only. Delete once the cause is found.

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { fetchTipsForMatches } from '@/lib/tips'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return NextResponse.json(authError, { status: 403 })

  const marks: Array<{ step: string; ms: number; rows?: number }> = []
  const time = async <T,>(step: string, fn: () => PromiseLike<T>, count?: (r: T) => number) => {
    const t0 = Date.now()
    const r = await fn()
    marks.push({ step, ms: Date.now() - t0, rows: count ? count(r) : undefined })
    return r
  }

  const total0 = Date.now()
  const supabase = await createClient()

  await time('auth.getUser', () => supabase.auth.getUser())

  const tournament = await time(
    'tournaments (is_active)',
    () => supabase.from('tournaments').select('id, name, slug, start_date').eq('is_active', true).maybeSingle(),
    r => (r.data ? 1 : 0),
  )
  const tid = tournament.data?.id

  const rounds = await time(
    'rounds',
    () => supabase.from('rounds').select('id, name, points_per_correct_tip, sort_order').eq('tournament_id', tid!).order('sort_order'),
    r => r.data?.length ?? 0,
  )
  const roundIds = (rounds.data ?? []).map(r => r.id)

  const matches = await time(
    'matches',
    () => supabase.from('matches').select('id, round_id, winner, no_points, scheduled_start, player1_name, player2_name').in('round_id', roundIds),
    r => r.data?.length ?? 0,
  )
  const matchIds = (matches.data ?? []).map(m => m.id)

  await time('tips (all pages)', () => fetchTipsForMatches(supabase, matchIds), r => r.length)
  await time('users', () => supabase.from('users').select('id, display_name, avatar_url').order('display_name'), r => r.data?.length ?? 0)

  return NextResponse.json({
    region: process.env.VERCEL_REGION ?? 'unknown',
    totalMs: Date.now() - total0,
    marks,
  })
}
