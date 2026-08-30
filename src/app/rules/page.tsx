import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/TabBar'

const ROUND_LONG: Record<string, string> = {
  R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
}

// Shown when there's no active tournament to read real values from.
const DEFAULT_POINTS: [string, number][] = [
  ['R64', 2], ['R32', 4], ['R16', 8], ['QF', 16], ['SF', 32], ['F', 64],
]

export default async function RulesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('is_active', true)
    .maybeSingle()

  const { data: rounds } = tournament
    ? await supabase
        .from('rounds')
        .select('name, points_per_correct_tip, sort_order')
        .eq('tournament_id', tournament.id)
        .order('sort_order')
    : { data: null }

  // 0 points means the round is shown in the draw but not tipped — leave it
  // out of the scoring table.
  const tippedRounds = (rounds ?? []).filter(r => r.points_per_correct_tip > 0)
  const pointsRows: [string, number][] = tippedRounds.length
    ? tippedRounds.map(r => [r.name, r.points_per_correct_tip])
    : DEFAULT_POINTS

  return (
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      {/* Masthead */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
          {tournament && (
            <span className="hidden rounded-full bg-[var(--brick-surface)] px-2.5 py-1 font-serif text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-[var(--brick)] sm:inline">
              {tournament.name}
            </span>
          )}
        </Link>
        <Link href="/profile" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)] hover:text-[var(--ink)]">Profile</Link>
      </header>

      {/* Hero */}
      <section className="uso-hero relative overflow-hidden px-5 py-7 text-white md:px-8 md:py-9">
        <span aria-hidden className="pointer-events-none absolute -top-5 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
              style={{ fontSize: 'clamp(120px, 22vw, 180px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}>
          RULES
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            The house rules{tournament ? ` · ${tournament.name}` : ''}
          </div>
          <h1 className="mt-2 font-serif text-[28px] font-bold leading-[1] md:text-[40px]">How the comp works, in plain English.</h1>
        </div>
      </section>

      {/* Rules — two columns on desktop */}
      <section className="flex-1 px-5 pb-10 pt-6 md:px-8 md:pt-7">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          <Rule heading="The basics" eyebrow="Rule I">
            <p>
              Each round, pick a winner for every tie in the men&apos;s draw.
              File from the Picks page or tap a name straight on the bracket.
              You can change any pick as often as you like, right up until the tie locks.
            </p>
          </Rule>

          <Rule heading="Locks and reveals" eyebrow="Rule II">
            <p>
              A tie locks at its scheduled start time. No late picks, no exceptions —
              the court doesn&apos;t wait. Until then your picks are yours alone; once a
              tie locks, the room&apos;s picks go on the table for everyone to see.
              No copying the leader&apos;s homework.
            </p>
          </Rule>

          <Rule heading="Scoring" eyebrow="Rule III">
            <p>
              Every correct call earns that round&apos;s points, and the stakes rise
              round on round{tournament ? ` — the ${tournament.name} pays as follows` : ''}.
              A wrong pick, or no pick, earns nothing. The table updates the moment
              results land.
            </p>
            <div className="mt-3 max-w-[320px]">
              {pointsRows.map(([name, pts], i) => (
                <div
                  key={name}
                  className="flex items-baseline justify-between py-1.5"
                  style={{ borderBottom: i === pointsRows.length - 1 ? 'none' : '1px dotted var(--rule)' }}
                >
                  <span className="text-[13px] text-[var(--ink-2)]">{ROUND_LONG[name] ?? name}</span>
                  <span className="font-serif text-[17px] leading-none tabular-nums">{pts}</span>
                </div>
              ))}
            </div>
          </Rule>

          <Rule heading="Walkovers and retirements" eyebrow="Rule IV">
            <p>
              If a player withdraws <span className="italic">before</span> a tie starts — a
              walkover — the tie is void: nobody scores a point on it, and whoever
              advances, advances. If a player retires <span className="italic">mid-match</span>,
              the result stands and points are paid as normal. Voided ties are marked
              &ldquo;no points&rdquo; wherever they appear.
            </p>
          </Rule>

          <Rule heading="The tiebreaker" eyebrow="Rule V">
            <p>
              Before the final, predict the total games it will go &mdash;
              a 6&ndash;4, 6&ndash;3, 6&ndash;2 final is 27 games. If the table is level
              when the last ball is struck, closest to that number takes it; if you&apos;re
              somehow still level, earliest filed wins.
            </p>
          </Rule>

          <Rule heading="The umpire's chair" eyebrow="Rule VI">
            <p>
              Anything these rules don&apos;t cover — rain, replaced seeds, scheduling
              quirks, acts of tennis gods — is settled from the umpire&apos;s chair by
              the admin. Decisions are final. Grumbling is free and encouraged.
            </p>
          </Rule>
        </div>

        <p className="mx-auto mt-8 max-w-5xl text-[14px] text-[var(--ink-2)]">
          That&apos;s the lot. <span className="font-semibold text-[var(--brick)]">Now go and file your picks.</span>
        </p>
      </section>

      <TabBar tournamentSlug={tournament?.slug} />
    </main>
  )
}

function Rule({ heading, eyebrow, children }: { heading: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <article className="tp-card p-5 md:p-6">
      <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-2.5">
        <h2 className="m-0 font-serif text-[19px] font-bold uppercase tracking-[0.03em] md:text-[20px]">{heading}</h2>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--blue)]">{eyebrow}</span>
      </div>
      <div className="mt-3 text-[14px] leading-[1.6] text-[var(--ink-2)] [&>p]:m-0">
        {children}
      </div>
    </article>
  )
}
