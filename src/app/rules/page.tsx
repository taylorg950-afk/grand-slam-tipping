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

  const pointsRows: [string, number][] = rounds?.length
    ? rounds.map(r => [r.name, r.points_per_correct_tip])
    : DEFAULT_POINTS

  return (
    <main className="relative flex min-h-screen flex-col">
      <div aria-hidden className="tp-paper-grain" />

      {/* Compact masthead */}
      <header className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule)] px-4 py-3 md:px-8">
        <Link href="/dashboard" className="font-serif italic text-[20px] leading-none tracking-tight md:text-[26px]">
          The Tipping Post
        </Link>
        <div className="tp-eyebrow flex items-center gap-5">
          {tournament && <span className="hidden md:inline">{tournament.name}</span>}
          <Link href="/profile" className="hover:text-[var(--ink)]">Profile</Link>
        </div>
      </header>

      {/* Banner */}
      <section className="relative z-10 overflow-hidden bg-[var(--brick)] px-4 py-5 text-[var(--paper)] md:px-8 md:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-3 -right-6 select-none whitespace-nowrap font-serif italic text-white/[0.07] md:-top-4 md:-right-8"
          style={{ fontSize: 'clamp(110px, 24vw, 200px)', lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          LAW
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] opacity-85 md:text-[10px]">
          The house rules
        </div>
        <h1 className="mt-1 font-serif text-[28px] leading-[1.04] tracking-tight md:text-[44px] md:mt-2">
          How the comp works, <span className="italic">in plain English.</span>
        </h1>
      </section>

      {/* Rules — two columns on desktop */}
      <section className="relative z-10 flex-1 px-4 pb-10 pt-6 md:px-8 md:pt-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-x-14 gap-y-8 md:grid-cols-2">
          <Rule heading="The basics" eyebrow="Rule I">
            <p>
              Each round, pick a winner for every tie — men&apos;s and women&apos;s draws.
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
              Before the finals, predict the total games played in each singles final —
              a 6&ndash;4, 6&ndash;3, 6&ndash;2 final is 27 games. If the table is level
              when the last ball is struck: closest on the men&apos;s total takes it,
              then the women&apos;s, and if you&apos;re somehow still level, earliest
              filed wins.
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

        <div className="tp-pull mx-auto mt-10 max-w-5xl">
          That&apos;s the lot. <span className="tp-pull__punch">Now go and file your picks.</span>
        </div>
      </section>

      <TabBar tournamentSlug={tournament?.slug} />
    </main>
  )
}

function Rule({ heading, eyebrow, children }: { heading: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <article>
      <div className="flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
        <h2 className="m-0 font-serif text-[20px] tracking-tight md:text-[22px]">{heading}</h2>
        <span className="tp-eyebrow">{eyebrow}</span>
      </div>
      <div className="mt-3 font-sans text-[14px] leading-[1.6] text-[var(--ink-2)] [&>p]:m-0">
        {children}
      </div>
    </article>
  )
}
