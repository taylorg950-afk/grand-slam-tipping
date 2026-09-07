import type { SupabaseClient } from '@supabase/supabase-js'

export interface TipRow {
  user_id: string
  match_id: string
  predicted_winner: string
}

// PostgREST returns at most ~1000 rows per request. A full men's + women's
// draw with a full room of tippers can exceed that, which would silently
// truncate scores. Page through with .range() so we always get every tip.
const PAGE_SIZE = 1000

export async function fetchTipsForMatches(
  supabase: SupabaseClient,
  matchIds: string[],
): Promise<TipRow[]> {
  if (matchIds.length === 0) return []

  const all: TipRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('tips')
      .select('user_id, match_id, predicted_winner')
      .in('match_id', matchIds)
      .order('match_id') // deterministic order so range paging is stable
      .order('user_id')
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as TipRow[]))
    if (data.length < PAGE_SIZE) break
  }
  return all
}

/**
 * How many of `matchIds` each person has filed a tip for.
 *
 * This deliberately runs with the service role, because row-level security
 * hides other people's tips on matches that have not locked yet — which is the
 * whole point of Rule II, and correct. But it means an ordinary member reading
 * `tips` sees only their own rows for an open round, so a "who has filed"
 * panel built from that shows everyone else on zero. Only an admin saw the
 * truth.
 *
 * A count is not a pick. Knowing Somya has filed 4 of 4 gives away nothing
 * about who she took, so the count is safe to show while the picks stay
 * hidden. To keep that distinction impossible to erode by accident, this
 * selects `user_id` alone — `predicted_winner` is never fetched, so no pick
 * can leak through here even if a caller misuses the result.
 *
 * Server components only: it must never be reached from the browser.
 */
export async function fetchFiledCounts(
  admin: SupabaseClient,
  matchIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (matchIds.length === 0) return counts

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('tips')
      .select('user_id')          // never predicted_winner
      .in('match_id', matchIds)
      .order('user_id')
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data as Array<{ user_id: string }>) {
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1)
    }
    if (data.length < PAGE_SIZE) break
  }
  return counts
}
