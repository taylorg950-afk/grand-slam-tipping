import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { setActiveTournament, deactivateAllTournaments } from './actions'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, slug, start_date, end_date, is_active')
    .order('start_date', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tournaments</h1>
        <Link
          href="/admin/tournaments/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          New tournament
        </Link>
      </div>

      {!tournaments?.length ? (
        <p className="text-sm text-zinc-500">No tournaments yet.</p>
      ) : (
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {tournaments.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.is_active && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">{t.start_date} → {t.end_date}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link href={`/admin/tournaments/${t.slug}/rounds`} className="text-zinc-500 hover:text-zinc-900">
                  Rounds
                </Link>
                {t.is_active ? (
                  <form action={deactivateAllTournaments}>
                    <button type="submit" className="text-zinc-400 hover:text-zinc-700">
                      Deactivate
                    </button>
                  </form>
                ) : (
                  <form action={setActiveTournament.bind(null, t.id)}>
                    <button type="submit" className="text-green-600 hover:text-green-800">
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
