import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { setActiveTournament, deactivateAllTournaments } from './actions'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, slug, start_date, end_date, is_active')
    .order('start_date', { ascending: false })

  // The stored range is entered by hand and drifts silently once matches are
  // rescheduled, so show what the fixtures actually say and flag a mismatch.
  const { data: roundRows } = await supabase.from('rounds').select('id, tournament_id')
  const { data: matchRows } = await supabase.from('matches').select('round_id, scheduled_start')
  const tournamentOfRound = new Map((roundRows ?? []).map(r => [r.id, r.tournament_id]))
  const span = new Map<string, { first: string; last: string }>()
  for (const m of matchRows ?? []) {
    const tid = tournamentOfRound.get(m.round_id)
    if (!tid || !m.scheduled_start) continue
    const day = m.scheduled_start.slice(0, 10)
    const cur = span.get(tid)
    if (!cur) span.set(tid, { first: day, last: day })
    else {
      if (day < cur.first) cur.first = day
      if (day > cur.last) cur.last = day
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[22px] font-bold uppercase tracking-[0.04em]">Tournaments</h1>
        <Link
          href="/admin/tournaments/new"
          className="tp-cta"
        >
          New tournament
        </Link>
      </div>

      {!tournaments?.length ? (
        <p className="text-sm text-[var(--ink-3)]">No tournaments yet.</p>
      ) : (
        <div className="divide-y divide-[var(--rule)] rounded-lg border border-[var(--rule)] bg-white">
          {tournaments.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.is_active && (
                    <span className="rounded-full bg-[var(--brick-surface)] px-2 py-0.5 text-xs font-medium text-[var(--olive)]">
                      Active
                    </span>
                  )}
                </div>
                <TournamentDates
                  stored={{ start: t.start_date, end: t.end_date }}
                  actual={span.get(t.id) ?? null}
                />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link href={`/admin/tournaments/${t.slug}/rounds`} className="text-[var(--ink-3)] hover:text-[var(--ink)]">
                  Rounds
                </Link>
                {t.is_active ? (
                  <form action={deactivateAllTournaments}>
                    <button type="submit" className="text-[var(--ink-3)] hover:text-[var(--ink-2)]">
                      Deactivate
                    </button>
                  </form>
                ) : (
                  <form action={setActiveTournament.bind(null, t.id)}>
                    <button type="submit" className="text-[var(--olive)] hover:text-[var(--olive)]">
                      Set active
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TournamentDates({
  stored,
  actual,
}: {
  stored: { start: string; end: string }
  actual: { first: string; last: string } | null
}) {
  if (!actual) {
    return <p className="text-xs text-[var(--ink-3)]">{stored.start} → {stored.end} · no fixtures yet</p>
  }
  const drifted = actual.first < stored.start || actual.last > stored.end
  if (!drifted) {
    return <p className="text-xs text-[var(--ink-3)]">{actual.first} → {actual.last}</p>
  }
  return (
    <p className="text-xs text-[var(--down)]">
      {actual.first} → {actual.last}
      <span className="text-[var(--ink-3)]"> · fixtures fall outside the listed {stored.start} → {stored.end}</span>
    </p>
  )
}
