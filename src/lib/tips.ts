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
