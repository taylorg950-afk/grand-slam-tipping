import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/TabBar'
import TiebreakerForm from './TiebreakerForm'

export default async function TiebreakerPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  // Find men's final to determine lock time
  const { data: mensFinalRound } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournament.id)
    .eq('name', 'F')
    .single()

  let locked = false
  if (mensFinalRound) {
    const { data: mensFinal } = await supabase
      .from('matches')
      .select('scheduled_start')
      .eq('round_id', mensFinalRound.id)
      .eq('draw', 'mens')
      .single()

    if (mensFinal && new Date(mensFinal.scheduled_start) <= new Date()) {
      locked = true
    }
  }

  const { data: existing } = user
    ? await supabase
        .from('tiebreakers')
        .select('mens_final_total_games, womens_final_total_games')
        .eq('user_id', user.id)
        .eq('tournament_id', tournament.id)
        .single()
    : { data: null }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EC] text-[#1B1814] relative">
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1B1814 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      <header className="relative z-10 border-b border-[#1B181420] px-5 py-3.5 flex items-center gap-3">
        <Link href={`/tournaments/${slug}/leaderboard`} className="flex items-center gap-3 text-[#3C342C]">
          <span className="text-lg leading-none">‹</span>
          <span className="text-[10px] uppercase tracking-[0.18em]">{tournament.name}</span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#1B181430]">·</span>
        <span className="font-serif italic text-[18px] leading-none text-[#1B1814]">Tiebreaker</span>
      </header>

      {/* Clay banner */}
      <section className="relative z-10 px-5 py-5 overflow-hidden text-[#FAF6EC]"
               style={{ background: 'linear-gradient(180deg, #B85433 0%, #8E3A1F 100%)' }}>
        <div aria-hidden className="absolute -right-8 -top-3 text-[140px] leading-none italic
                                    font-serif text-white/[0.06] select-none pointer-events-none">
          TB
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1">Finals prediction</div>
        <h1 className="font-serif text-3xl leading-[1.05] tracking-tight">
          Break the tie.
          <br />
          <span className="italic text-[#F2EBDC] text-2xl">
            Predict total games in each final.
          </span>
        </h1>
        <p className="mt-3 text-xs text-white/75 leading-relaxed max-w-sm">
          If players finish level on points, the tiebreaker decides the winner.
          Closest to the actual game count wins — for both finals, in order.
        </p>
      </section>

      <main className="relative z-10 flex-1 px-5 pt-6 pb-8">
        {/* Rules card */}
        <div className="mb-6 rounded-[2px] border border-[#1B181415] bg-[#F2EBDC] px-4 py-3 space-y-1.5">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold mb-2">
            How it works
          </div>
          <Rule n={1} text="Predict total games in the men's singles final (e.g. 6-4 6-3 6-2 = 27 games)" />
          <Rule n={2} text="If still tied, women's singles final total games is used" />
          <Rule n={3} text="If still tied, earliest submission timestamp for the men's final tip wins" />
          <p className="text-[10px] text-[#3C342C] opacity-60 mt-2 pt-2 border-t border-[#1B181415]">
            Locked when the men&apos;s final begins. Submit any time before then.
          </p>
        </div>

        <TiebreakerForm
          tournamentId={tournament.id}
          slug={slug}
          existing={{
            mens: existing?.mens_final_total_games ?? null,
            womens: existing?.womens_final_total_games ?? null,
          }}
          locked={locked}
        />
      </main>

      <TabBar tournamentSlug={slug} />
    </div>
  )
}

function Rule({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-2.5 items-start text-[11px] text-[#3C342C] leading-snug">
      <span className="font-serif italic text-base text-[#B85433] leading-none mt-[-1px] shrink-0">{n}.</span>
      <span>{text}</span>
    </div>
  )
}
