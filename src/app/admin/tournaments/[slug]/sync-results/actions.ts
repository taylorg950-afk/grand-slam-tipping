'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'
import { fetchDrawWikitext, parseDraw } from '@/lib/results/wikipedia'
import { advanceBracket } from '../rounds/[name]/results/actions'

export interface SyncReport {
  error?: string
  /** Matches written this run. */
  applied: string[]
  /** Matches on the page that are still being played. */
  inProgress: string[]
  /** Already recorded here, so left alone. */
  unchanged: number
  /** Recorded here but the page says something else — needs a human. */
  conflicts: string[]
  /** On the page but not matching our draw — usually a stale or edited page. */
  mismatches: string[]
  /** Names filled into the next round off the back of this run. */
  advanced: string[]
}

const surname = (n: string) => n.trim().split(/\s+/).slice(-1)[0]

export async function syncResults(
  _prev: SyncReport | null,
  formData: FormData
): Promise<SyncReport> {
  const empty: SyncReport = {
    applied: [], inProgress: [], unchanged: 0, conflicts: [], mismatches: [], advanced: [],
  }

  const authError = await requireAdmin()
  if (authError) return { ...empty, error: authError.error }

  const slug = String(formData.get('slug') ?? '')
  const url = String(formData.get('url') ?? '').trim()
  if (!url) return { ...empty, error: 'Paste the Wikipedia draw URL first.' }

  let wikitext: string
  try {
    wikitext = await fetchDrawWikitext(url)
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : 'Could not read that page.' }
  }

  const supabase = await createClient()
  const { data: tournament } = await supabase
    .from('tournaments').select('id').eq('slug', slug).single()
  if (!tournament) return { ...empty, error: 'Tournament not found.' }

  const { data: rounds } = await supabase
    .from('rounds').select('id, name, sort_order').eq('tournament_id', tournament.id)
  if (!rounds?.length) return { ...empty, error: 'This tournament has no rounds yet.' }
  const roundIdByName = new Map(rounds.map(r => [r.name, r.id]))

  const { data: matches } = await supabase
    .from('matches')
    .select('id, round_id, bracket_position, player1_name, player2_name, winner, score')
    .in('round_id', rounds.map(r => r.id))
  if (!matches?.length) return { ...empty, error: 'This tournament has no matches yet.' }

  const { results, inProgress } = parseDraw(wikitext)
  const report: SyncReport = { ...empty, inProgress }
  const written: string[] = []

  for (const r of results) {
    const roundId = roundIdByName.get(r.round)
    if (!roundId) continue                       // a round this comp does not run
    const match = matches.find(m => m.round_id === roundId && m.bracket_position === r.position)
    if (!match) continue

    // The page and our draw must agree on both players before anything is
    // written. A published bracket can carry a stale fixture, and position
    // alone would happily record a result against the wrong pair.
    const w = surname(r.winner)
    const l = surname(r.loser)
    const winnerIsP1 = match.player1_name.includes(w)
    const winnerIsP2 = match.player2_name.includes(w)
    const loserOnOtherSide = (winnerIsP1 ? match.player2_name : match.player1_name).includes(l)
    if (winnerIsP1 === winnerIsP2 || !loserOnOtherSide) {
      report.mismatches.push(
        `${r.round} #${r.position}: page says ${r.winner} d. ${r.loser}, draw has ${match.player1_name} v ${match.player2_name}`
      )
      continue
    }

    const winner = winnerIsP1 ? 'player1' : 'player2'

    // First write wins. A result entered by hand here — a correction, or a
    // walkover the page never recorded — outranks anything read off the page.
    if (match.winner) {
      if (match.winner !== winner) {
        report.conflicts.push(
          `${r.round} #${r.position}: recorded as ${match.winner === 'player1' ? match.player1_name : match.player2_name}, page says ${r.winner}`
        )
      } else {
        report.unchanged++
      }
      continue
    }

    const { error } = await supabase
      .from('matches').update({ winner, score: r.score }).eq('id', match.id)
    if (error) {
      report.mismatches.push(`${r.round} #${r.position}: ${error.message}`)
      continue
    }
    written.push(match.id)
    report.applied.push(`${r.round} #${r.position}: ${r.winner} d. ${r.loser} — ${r.score}`)

    const next = await advanceBracket(supabase, match.id, winner)
    if (next) report.advanced.push(next)
  }

  if (written.length) {
    revalidatePath('/dashboard')
    revalidatePath('/admin', 'layout')
    revalidatePath(`/tournaments/${slug}`, 'layout')
  }
  return report
}
