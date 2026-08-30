import { createAdminClient } from '@/lib/supabase/admin'
import { fetchTipsForMatches } from '@/lib/tips'

const ROUND_LONG: Record<string, string> = {
  R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
}

export default async function AdminPicksStatusPage() {
  const admin = createAdminClient()

  const { data: tournament } = await admin
    .from('tournaments')
    .select('id, name')
    .eq('is_active', true)
    .maybeSingle()

  if (!tournament) {
    return (
      <div className="space-y-2">
        <h1 className="font-serif text-[22px] font-bold uppercase tracking-[0.04em]">Picks status</h1>
        <p className="text-sm text-[var(--ink-3)]">No active tournament.</p>
      </div>
    )
  }

  const [{ data: rounds }, { data: users }] = await Promise.all([
    admin.from('rounds').select('id, name, sort_order').eq('tournament_id', tournament.id).order('sort_order'),
    admin.from('users').select('id, display_name').order('display_name'),
  ])
  const orderedRounds = rounds ?? []
  const roundIds = orderedRounds.map(r => r.id)

  const { data: allMatches } = roundIds.length
    ? await admin.from('matches').select('id, round_id, winner, scheduled_start').in('round_id', roundIds)
    : { data: [] as { id: string; round_id: string; winner: string | null; scheduled_start: string }[] }
  const matches = allMatches ?? []

  // Active round = first round (by sort_order) that has matches and isn't fully resulted.
  const activeRound =
    orderedRounds.find(r => {
      const rm = matches.filter(m => m.round_id === r.id)
      return rm.length > 0 && rm.some(m => !m.winner)
    }) ?? orderedRounds.find(r => matches.some(m => m.round_id === r.id)) ?? null

  if (!activeRound) {
    return (
      <div className="space-y-2">
        <h1 className="font-serif text-[22px] font-bold uppercase tracking-[0.04em]">Picks status</h1>
        <p className="text-sm text-[var(--ink-3)]">No rounds with matches yet for {tournament.name}.</p>
      </div>
    )
  }

  const roundMatches = matches.filter(m => m.round_id === activeRound.id)
  const roundMatchIds = new Set(roundMatches.map(m => m.id))
  const now = new Date()
  // "Open" = still pickable (lock time in the future). These are what a reminder can fix.
  const openMatchIds = new Set(roundMatches.filter(m => new Date(m.scheduled_start) > now).map(m => m.id))
  const total = roundMatches.length
  const openCount = openMatchIds.size

  const tips = await fetchTipsForMatches(admin, [...roundMatchIds])

  const rows = (users ?? []).map(u => {
    const myMatchIds = new Set(tips.filter(t => t.user_id === u.id && roundMatchIds.has(t.match_id)).map(t => t.match_id))
    const filed = myMatchIds.size
    const stillToPick = [...openMatchIds].filter(id => !myMatchIds.has(id)).length
    return { id: u.id, name: u.display_name, filed, stillToPick }
  })

  // Most urgent first: people with open matches left to pick, then fewest filed.
  rows.sort((a, b) => b.stillToPick - a.stillToPick || a.filed - b.filed || a.name.localeCompare(b.name))

  const needReminding = rows.filter(r => r.stillToPick > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[22px] font-bold uppercase tracking-[0.04em]">Picks status</h1>
        <p className="mt-1 text-sm text-[var(--ink-3)]">
          {tournament.name} · {ROUND_LONG[activeRound.name] ?? activeRound.name} ·{' '}
          {total} match{total === 1 ? '' : 'es'}
          {openCount > 0
            ? ` · ${openCount} still open to pick`
            : ' · all locked'}
        </p>
      </div>

      {needReminding.length > 0 ? (
        <div className="rounded-lg border border-[var(--rule)] bg-[var(--you-bg)] px-4 py-3 text-sm text-[var(--down)]">
          <span className="font-medium">Chase up:</span>{' '}
          {needReminding.map(r => `${r.name} (${r.stillToPick})`).join(', ')}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--rule)] bg-[var(--brick-surface)] px-4 py-3 text-sm text-[var(--olive)]">
          Everyone&apos;s in for the open matches. Nothing to chase.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-[var(--rule)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--rule)] text-left text-xs uppercase tracking-wide text-[var(--ink-3)]">
              <th className="px-4 py-2 font-medium">Player</th>
              <th className="px-4 py-2 font-medium text-right">Filed</th>
              <th className="px-4 py-2 font-medium text-right">Still to pick</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--paper-3)]">
            {rows.map(r => {
              const complete = r.stillToPick === 0
              return (
                <tr key={r.id} className={complete ? '' : 'bg-[var(--you-bg)]/40'}>
                  <td className="px-4 py-2.5 font-medium text-[var(--ink)]">{r.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-2)]">
                    {r.filed}/{total}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {r.stillToPick > 0 ? (
                      <span className="font-semibold text-[var(--down)]">{r.stillToPick}</span>
                    ) : (
                      <span className="text-[var(--olive)]">✓</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--ink-3)]">
        &ldquo;Still to pick&rdquo; counts only matches that are still open (lock time in the future) — already-locked
        matches can no longer be picked, so they&apos;re not something to chase.
      </p>
    </div>
  )
}
