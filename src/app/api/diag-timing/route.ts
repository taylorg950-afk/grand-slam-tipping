// TEMPORARY diagnostic. (An _underscore folder is private in the App Router and
// never routes, hence the plain name.) Times, from inside the deployed function, each step the
// dashboard performs — so slowness can be attributed to a step instead of
// guessed at from the outside. Admin only. Delete once the cause is found.

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { fetchTipsForTournament } from '@/lib/tips'
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
    'tournaments + profile + users (parallel)',
    () => Promise.all([
      supabase.from('tournaments').select('id, name, slug, start_date').eq('is_active', true).maybeSingle(),
      supabase.from('users').select('display_name, is_admin').limit(1),
      supabase.from('users').select('id, display_name, avatar_url').order('display_name'),
    ]),
    r => r[2].data?.length ?? 0,
  )
  const tid = tournament[0].data?.id as string

  await time(
    'rounds+matches embedded AND tips (parallel)',
    () => Promise.all([
      supabase
        .from('rounds')
        .select('id, name, points_per_correct_tip, sort_order, matches(id, round_id, winner, no_points, scheduled_start, player1_name, player2_name)')
        .eq('tournament_id', tid).order('sort_order'),
      fetchTipsForTournament(supabase, tid),
    ]),
    r => (r[1] as unknown[]).length,
  )

  return NextResponse.json({
    region: process.env.VERCEL_REGION ?? 'unknown',
    totalMs: Date.now() - total0,
    marks,
  })
}
