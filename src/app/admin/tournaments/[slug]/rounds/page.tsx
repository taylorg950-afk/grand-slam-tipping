import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RoundPointsForm from './RoundPointsForm'
import SyncResultsForm from '../sync-results/SyncResultsForm'

/**
 * A first guess at the draw page so the field is rarely typed from scratch.
 * Wikipedia titles these consistently: "2026 US Open – Men's singles", with an
 * en dash. It is only a default — the admin can paste any en.wikipedia.org URL.
 */
function wikiGuess(name: string): string | undefined {
  // Tournaments here are named either way round: "US Open 2026" or "2026 US Open".
  const m = name.match(/^\s*(\d{4})\s+(.+?)\s*$/) ?? name.match(/^\s*(.+?)\s+(\d{4})\s*$/)
  if (!m) return undefined
  const [year, event] = /^\d{4}$/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]]
  const title = `${year} ${event.trim()} \u2013 Men's singles`
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

export default async function TournamentRoundsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id)
    .order('sort_order')

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">← Admin</Link>
        <h1 className="mt-2 font-serif text-[22px] font-bold uppercase tracking-[0.04em]">{tournament.name}</h1>
        <p className="text-sm text-[var(--ink-3)]">Rounds</p>
      </div>

      <SyncResultsForm slug={slug} defaultUrl={wikiGuess(tournament.name)} />

      <div className="flex justify-end">
        <Link
          href={`/admin/tournaments/${slug}/import-draw`}
          className="tp-cta"
        >
          Import draw from PDF
        </Link>
      </div>

      <div className="divide-y divide-[var(--rule)] rounded-lg border border-[var(--rule)] bg-white">
        {rounds?.map((round) => (
          <div key={round.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="text-sm font-medium">{round.name}</span>
              <RoundPointsForm roundId={round.id} slug={slug} initialPoints={round.points_per_correct_tip} />
            </div>
            <div className="flex gap-4 text-sm">
              <Link href={`/admin/tournaments/${slug}/rounds/${round.name}/matches`} className="text-[var(--ink-3)] hover:text-[var(--ink)]">
                Matches
              </Link>
              <Link href={`/admin/tournaments/${slug}/rounds/${round.name}/results`} className="text-[var(--ink-3)] hover:text-[var(--ink)]">
                Results
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
