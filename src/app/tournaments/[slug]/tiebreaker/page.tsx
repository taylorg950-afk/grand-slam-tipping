import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/TabBar'
import TiebreakerForm from './TiebreakerForm'

// Seeded history per tournament. Add entries as data becomes available;
// tournaments without a key skip the strip. Numbers are total games in
// each singles final.
const HISTORY: Record<string, { year: string; mens: number; womens: number }[]> = {
  'italian-open': [
    { year: '2016', mens: 32, womens: 21 },
    { year: '2017', mens: 38, womens: 18 },
    { year: '2018', mens: 36, womens: 23 },
    { year: '2019', mens: 27, womens: 20 },
    { year: '2020', mens: 41, womens: 22 },
    { year: '2021', mens: 33, womens: 19 },
    { year: '2022', mens: 30, womens: 26 },
    { year: '2023', mens: 35, womens: 21 },
    { year: '2024', mens: 39, womens: 18 },
    { year: '2025', mens: 29, womens: 24 },
  ],
}

function historyFor(slug: string) {
  for (const key of Object.keys(HISTORY)) if (slug.includes(key)) return HISTORY[key]
  return null
}

function historyAverages(rows: { mens: number; womens: number }[]) {
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
  const mensValues = rows.map(r => r.mens)
  const womensValues = rows.map(r => r.womens)
  return {
    mensAvg: avg(mensValues),
    mensMin: Math.min(...mensValues),
    mensMax: Math.max(...mensValues),
    womensAvg: avg(womensValues),
    womensMin: Math.min(...womensValues),
    womensMax: Math.max(...womensValues),
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
    .select('mens_final_total_games, womens_final_total_games, updated_at')
    .eq('user_id', user.id)
    .eq('tournament_id', tournament.id)
    .maybeSingle()

  const history = historyFor(tournament.slug)
  const averages = history ? historyAverages(history) : null

  return (
    <main className="relative flex min-h-screen flex-col">
      <div aria-hidden className="tp-paper-grain" />

      {/* Compact masthead */}
      <header className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule)] px-4 py-3 md:px-8">
        <Link href="/dashboard" className="font-serif italic text-[20px] leading-none tracking-tight md:text-[26px]">
          The Tipping Post
        </Link>
        <div className="tp-eyebrow flex items-center gap-5">
          <span className="hidden md:inline">{tournament.name}</span>
          <Link href="/profile" className="hover:text-[var(--ink)]">Profile</Link>
        </div>
      </header>

      {/* Banner */}
      <section className="relative z-10 overflow-hidden bg-[var(--brick)] px-4 py-5 text-[var(--paper)] md:px-8 md:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-4 -right-6 select-none whitespace-nowrap font-serif italic text-white/[0.07] md:-top-8 md:-right-8"
          style={{ fontSize: 'clamp(120px, 26vw, 240px)', lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          FINAL
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] opacity-85 md:text-[10px]">
          The Final Word · Tiebreaker
        </div>
        <h1 className="mt-1 font-serif text-[32px] leading-[1.04] tracking-tight md:text-[52px] md:mt-2">
          How many games <span className="italic">in the final?</span>
        </h1>
        <div className="mt-3 text-[11px] text-white/90 md:text-[13px]">
          Locks at the start of the men&apos;s final · {tournament.name}
        </div>
      </section>

      {/* Rules — two-col on desktop */}
      <section className="relative z-10 grid grid-cols-1 gap-6 border-b border-[var(--rule)] px-4 py-6 md:grid-cols-[7fr_5fr] md:gap-9 md:px-8 md:py-7">
        <div>
          <div className="tp-eyebrow mb-2.5">From the rules</div>
          <h2 className="m-0 mb-3 font-serif text-[24px] leading-[1.15] tracking-tight md:text-[30px]">
            Two numbers to break a tie at the line.
          </h2>
          <p className="m-0 max-w-[600px] font-sans text-[14px] leading-[1.55] text-[var(--ink-2)]">
            Predict the total number of games played in each singles final.
            A 6–4, 6–3, 6–2 final is 27 games. The men&apos;s number is the
            primary tiebreaker; the women&apos;s number is the backup; if
            you&apos;re still level, earliest filed wins.
          </p>
        </div>
        <div className="tp-card p-4 md:p-5">
          <div className="tp-eyebrow tp-eyebrow--brick mb-2.5">How it counts</div>
          <ol className="m-0 list-decimal space-y-1.5 pl-5 font-sans text-[13px] leading-[1.6] text-[var(--ink-2)]">
            <li><b className="font-medium text-[var(--ink)]">Closest to actual</b> men&apos;s final total games.</li>
            <li>If still tied, closest to actual women&apos;s final.</li>
            <li>If still tied, earliest submission wins.</li>
          </ol>
          <div className="mt-3 border-t border-dotted border-[var(--rule)] pt-3 font-serif italic text-[12px] leading-[1.4] text-[var(--ink-3)]">
            You can edit until the men&apos;s final starts. After that, it&apos;s locked.
          </div>
        </div>
      </section>

      {/* Scrubbers + Your call + Save */}
      <TiebreakerForm
        tournamentId={tournament.id}
        slug={slug}
        existing={{
          mens: existing?.mens_final_total_games ?? null,
          womens: existing?.womens_final_total_games ?? null,
          updatedAt: existing?.updated_at ?? null,
        }}
        averages={averages}
        locked={locked}
      />

      {/* History strip */}
      {history && (
        <section className="relative z-10 px-4 pb-6 pt-2 md:px-8 md:pb-8">
          <div className="mb-3 border-b-2 border-[var(--ink)] pb-2">
            <h2 className="m-0 font-serif text-[20px] tracking-tight md:text-[22px]">
              Last ten {tournament.name.replace(/\s*\d{4}\s*$/, '')} finals
            </h2>
          </div>
          <div className="grid grid-cols-5 gap-y-3 md:grid-cols-10 md:gap-y-0">
            {history.map((y, i) => (
              <div
                key={y.year}
                className="px-2 py-2.5 text-center md:px-2 md:py-3"
                style={{
                  borderRight:
                    i === history.length - 1
                      ? 'none'
                      : (i + 1) % 5 === 0
                        ? 'none' // mobile row break — last in the row
                        : '1px solid var(--rule)',
                }}
              >
                <div className="tp-eyebrow">{y.year}</div>
                <div className="mt-2 font-serif text-[24px] leading-none tabular-nums md:text-[28px]">
                  {y.mens}
                </div>
                <div className="mt-1 font-serif italic text-[11px] text-[var(--ink-3)]">
                  men · {y.womens} W
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <TabBar tournamentSlug={slug} />
    </main>
  )
}
