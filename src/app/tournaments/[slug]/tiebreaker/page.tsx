import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/TabBar'
import TiebreakerForm from './TiebreakerForm'

// Seeded history per tournament. Add entries as data becomes available;
// tournaments without a key skip the strip. Numbers are total games in
// each singles final.
const HISTORY: Record<string, { year: string; mens: number }[]> = {
  'italian-open': [
    { year: '2016', mens: 32 },
    { year: '2017', mens: 38 },
    { year: '2018', mens: 36 },
    { year: '2019', mens: 27 },
    { year: '2020', mens: 41 },
    { year: '2021', mens: 33 },
    { year: '2022', mens: 30 },
    { year: '2023', mens: 35 },
    { year: '2024', mens: 39 },
    { year: '2025', mens: 29 },
  ],
}

function historyFor(slug: string) {
  for (const key of Object.keys(HISTORY)) if (slug.includes(key)) return HISTORY[key]
  return null
}

function historyAverages(rows: { mens: number }[]) {
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
  const mensValues = rows.map(r => r.mens)
  return {
    mensAvg: avg(mensValues),
    mensMin: Math.min(...mensValues),
    mensMax: Math.max(...mensValues),
  }
}

export default async function TiebreakerPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  if (!tournament) notFound()

  // Lock state — locks once EITHER final (men's or women's) has started.
  const { data: finalRound } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournament.id)
    .eq('name', 'F')
    .single()

  let locked = false
  if (finalRound) {
    const { data: finals } = await supabase
      .from('matches')
      .select('scheduled_start')
      .eq('round_id', finalRound.id)
      .in('draw', ['mens', 'womens'])
    const now = new Date()
    locked = (finals ?? []).some(f => new Date(f.scheduled_start) <= now)
  }

  const { data: existing } = await supabase
    .from('tiebreakers')
    .select('mens_final_total_games, updated_at')
    .eq('user_id', user.id)
    .eq('tournament_id', tournament.id)
    .maybeSingle()

  const history = historyFor(tournament.slug)
  const averages = history ? historyAverages(history) : null

  return (
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      {/* Masthead */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
          <span className="hidden rounded-full bg-[var(--brick-surface)] px-2.5 py-1 font-serif text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-[var(--brick)] sm:inline">
            {tournament.name}
          </span>
        </Link>
        <Link href="/profile" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)] hover:text-[var(--ink)]">
          Profile
        </Link>
      </header>

      {/* Hero */}
      <section className="uso-hero relative overflow-hidden px-5 py-7 text-white md:px-8 md:py-9">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
          style={{ fontSize: 'clamp(120px, 24vw, 190px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}
        >
          FINAL
        </span>
        <div className="tp-wrap relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            The tiebreaker · {tournament.name}
          </div>
          <h1 className="mt-2 font-serif text-[30px] font-bold leading-[1] md:text-[40px]">Call the final.</h1>
          <div className="mt-3 max-w-xl text-[14px] leading-[1.5]" style={{ color: '#DDE6FA' }}>
            Total games in the men&apos;s final breaks a dead heat — closest takes it, then earliest filed. Edit until the final starts.
          </div>
        </div>
      </section>

      {/* Scrubbers + Your call + Save */}
      <TiebreakerForm
        tournamentId={tournament.id}
        slug={slug}
        existing={{
          mens: existing?.mens_final_total_games ?? null,
          updatedAt: existing?.updated_at ?? null,
        }}
        averages={averages}
        locked={locked}
      />

      {/* History strip */}
      {history && (
        <section className="px-5 pb-8 pt-3 md:px-8">
          <div className="tp-card p-5 md:px-6">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-3)]">
              Last ten {tournament.name.replace(/\s*\d{4}\s*$/, '')} finals · total games
            </div>
            <div className="grid grid-cols-5 gap-2.5 md:grid-cols-10">
              {history.map(y => (
                <div key={y.year} className="rounded-[12px] py-3 text-center" style={{ background: 'var(--paper-3)' }}>
                  <div className="text-[12px] font-semibold text-[var(--ink-3)]">{y.year}</div>
                  <div className="mt-1 font-serif text-[24px] font-bold leading-none tabular-nums text-[var(--ink)] md:text-[26px]">
                    {y.mens}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <TabBar tournamentSlug={slug} />
    </main>
  )
}
