import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TabBar } from '@/components/TabBar'
import { computeScores } from '@/lib/scoring'
import { fetchTipsForMatches } from '@/lib/tips'
import { AEST_TZ, AEST_LABEL } from '@/lib/time'

const ROUND_LONG: Record<string, string> = {
  R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}
function stripSeed(n: string) { return n.replace(/\s*\[.*?\]/, '').trim() }
function fmtDay(d: string) {
  return new Date(d).toLocaleString('en-AU', {
    timeZone: AEST_TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: false,
  }) + ' ' + AEST_LABEL
}

export default async function TipperPage({
  params,
}: {
  params: Promise<{ slug: string; userId: string }>
}) {
  const { slug, userId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tournament } = await supabase
    .from('tournaments').select('id, name, slug').eq('slug', slug).single()
  if (!tournament) notFound()

  const { data: profile } = await supabase
    .from('users').select('id, display_name, avatar_url, catchphrase').eq('id', userId).single()
  if (!profile) notFound()

  const { data: roundData } = await supabase
    .from('rounds').select('id, name, points_per_correct_tip, sort_order')
    .eq('tournament_id', tournament.id).order('sort_order')
  // A round worth 0 points is in the draw but not tipped.
  const rounds = (roundData ?? []).filter(r => r.points_per_correct_tip > 0)

  const { data: matchData } = rounds.length
    ? await supabase.from('matches')
        .select('id, round_id, player1_name, player2_name, winner, score, no_points, scheduled_start')
        .in('round_id', rounds.map(r => r.id))
    : { data: [] }
  const matches = matchData ?? []

  const { data: users } = await supabase.from('users').select('id, display_name')
  const tips = await fetchTipsForMatches(supabase, matches.map(m => m.id))

  const scores = computeScores(users ?? [], matches, rounds, tips)
  const rank = scores.findIndex(s => s.id === userId) + 1
  const me = scores.find(s => s.id === userId)
  const accuracy = me && me.judgedTips > 0 ? Math.round((me.correctTips / me.judgedTips) * 100) : null

  const isMe = userId === user.id
  const now = new Date()
  const myTips = new Map(tips.filter(t => t.user_id === userId).map(t => [t.match_id, t.predicted_winner]))

  // Rule II: a pick stays private until its match locks. Anyone can see their
  // own at any time; another tipper's only once the tie has started.
  const visible = (m: { scheduled_start: string }) => isMe || new Date(m.scheduled_start) <= now

  const byRound = rounds.map(r => {
    const rm = matches.filter(m => m.round_id === r.id)
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
    const picks = rm.filter(m => myTips.has(m.id))
    const judged = picks.filter(m => m.winner && !m.no_points)
    const correct = judged.filter(m => myTips.get(m.id) === m.winner)
    return {
      round: r, rm, picks, judged: judged.length,
      correct: correct.length,
      points: correct.length * r.points_per_correct_tip,
      hidden: picks.filter(m => !visible(m)).length,
    }
  }).filter(x => x.picks.length > 0)

  return (
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
        </Link>
        <Link href={`/tournaments/${slug}/leaderboard`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-2)] hover:text-[var(--ink)]">
          ← Standings
        </Link>
      </header>

      {/* Hero */}
      <section className="uso-hero relative overflow-hidden px-5 py-7 text-white md:px-8 md:py-9">
        <div className="tp-wrap relative flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" style={{ width: 64, height: 64, flexShrink: 0, objectFit: 'cover', borderRadius: '9999px' }} />
          ) : (
            <span className="flex shrink-0 items-center justify-center rounded-full text-[22px] font-semibold"
                  style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.18)' }}>
              {initials(profile.display_name)}
            </span>
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
              {tournament.name}
            </div>
            <h1 className="mt-1 font-serif text-[30px] font-bold leading-[1] md:text-[40px]">
              {profile.display_name}{isMe && <span className="text-[18px] font-medium" style={{ color: '#B9CBF2' }}> · you</span>}
            </h1>
            {profile.catchphrase && (
              <div className="mt-1.5 text-[14px]" style={{ color: '#DDE6FA' }}>{profile.catchphrase}</div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="tp-wrap px-5 pt-6 md:px-8">
        <div className="grid grid-cols-3 gap-3.5">
          {[
            { k: 'Rank', v: rank > 0 ? String(rank) : '—', sub: `of ${scores.length}` },
            { k: 'Points', v: String(me?.totalPoints ?? 0), sub: 'this tournament' },
            { k: 'Accuracy', v: accuracy == null ? '—' : `${accuracy}%`, sub: me ? `${me.correctTips} of ${me.judgedTips} judged` : 'no results yet' },
          ].map(s => (
            <div key={s.k} className="tp-card p-4 md:p-5">
              <div className="tp-eyebrow">{s.k}</div>
              <div className="mt-1.5 font-serif text-[30px] font-bold leading-none tabular-nums md:text-[36px]">{s.v}</div>
              <div className="mt-1.5 text-[12px] text-[var(--ink-3)]">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Picks by round */}
      <section className="tp-wrap flex-1 px-5 pb-8 pt-5 md:px-8">
        {byRound.length === 0 ? (
          <div className="tp-card p-8 text-center text-[14px] text-[var(--ink-2)]">
            {isMe ? 'You haven’t filed any tips yet.' : `${profile.display_name} hasn’t filed any tips yet.`}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {byRound.map(({ round, rm, judged, correct, points, hidden }) => (
              <div key={round.id} className="tp-card p-5 md:px-6">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--rule)] pb-3">
                  <h2 className="m-0 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">
                    {ROUND_LONG[round.name] ?? round.name}
                  </h2>
                  <span className="text-[12px] text-[var(--ink-3)]">
                    {judged > 0 ? `${correct}/${judged} correct · +${points} pts` : 'no results yet'}
                    {hidden > 0 && ` · ${hidden} hidden until lock`}
                  </span>
                </div>
                <div className="flex flex-col">
                  {rm.filter(m => myTips.has(m.id)).map(m => {
                    const pick = myTips.get(m.id)
                    const shown = visible(m)
                    const resulted = !!m.winner && !m.no_points
                    const right = resulted && pick === m.winner
                    const picked = pick === 'player1' ? m.player1_name : m.player2_name
                    return (
                      <div key={m.id} className="flex items-center gap-3 border-b border-[var(--rule-soft)] py-2.5 last:border-b-0">
                        <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink-2)]">
                          {stripSeed(m.player1_name)} <span className="text-[var(--ink-3)]">v</span> {stripSeed(m.player2_name)}
                        </span>
                        <span className="hidden shrink-0 text-[11px] tabular-nums text-[var(--ink-3)] sm:inline">
                          {fmtDay(m.scheduled_start)}
                        </span>
                        <span
                          className="w-[136px] shrink-0 truncate text-right text-[14px] font-semibold"
                          style={{ color: !shown ? 'var(--ink-3)' : resulted ? (right ? 'var(--olive)' : 'var(--down)') : 'var(--brick)' }}
                        >
                          {shown ? stripSeed(picked) : 'hidden'}
                        </span>
                        {shown && resulted && (
                          <span
                            className="w-10 shrink-0 rounded-full px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em]"
                            style={right
                              ? { color: 'var(--olive)', background: '#E7F3EC' }
                              : { color: 'var(--down)', background: '#FBE9E4' }}
                          >
                            {right ? `+${round.points_per_correct_tip}` : '0'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <TabBar tournamentSlug={slug} />
    </main>
  )
}
