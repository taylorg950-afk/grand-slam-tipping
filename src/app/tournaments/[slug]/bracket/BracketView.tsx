'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TabBar } from '@/components/TabBar'
import { submitTip } from '../round/[name]/actions'

interface DbRound {
  id: string
  name: string
  points_per_correct_tip: number
  sort_order: number
}

interface DbMatch {
  id: string
  round_id: string
  player1_name: string
  player2_name: string
  scheduled_start: string
  winner: string | null
  score: string | null
  no_points: boolean
  draw: string
  created_at: string
  bracket_position: number | null
}

interface MyTip { match_id: string; predicted_winner: string }

interface Tournament {
  name: string
  slug: string
}

interface Props {
  tournament: Tournament
  rounds: DbRound[]
  matches: DbMatch[]
  myTips: MyTip[]
}

const ROUND_LONG: Record<string, string> = {
  R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
}

const MW = 230
// A card is two rows plus its own 1px top/bottom border. Derive MH from that
// rather than hard-coding it: the two must agree or the absolutely-positioned
// cards overlap their neighbours, which is exactly what happened when the
// reskin made the rows taller and this constant stayed at 38.
const ROW_H = 26
const MH = ROW_H * 2 + 2
const GV = 3
const GC = 26

function stripSeed(name: string) {
  return name.replace(/\s*\[.*?\]/, '').trim()
}
function parseSeed(name: string): string | null {
  return name.match(/\[(\d+)\]/)?.[1] ?? null
}

// Position in the *half* (already shifted), column index → centre y in px.
function yForHalfMatch(positionInHalf: number, col: number): number {
  // Each col compresses positions: col 0 holds 2^maxCol leaves per top-of-bracket,
  // each match at col c spans 2^c slots → y centre = (pos * 2^c + 2^(c-1)) * rowH
  const rowH = MH + GV
  return positionInHalf * Math.pow(2, col) * rowH + Math.pow(2, col) * rowH / 2 - GV / 2
}

interface BracketCard {
  id: string
  col: number
  positionInHalf: number  // 0-based slot within this half at this column
  half: 'top' | 'bottom' | 'final'
  roundName: string
  player1: string
  player2: string
  winner: string | null
  score: string | null
  noPoints: boolean
  myPick: string | null
  isLocked: boolean
  isResulted: boolean
  isLive: boolean
}

interface BuiltBracket {
  cards: BracketCard[]
  halfSlots: number   // matches in R0 per half (incl. byes)
  halfH: number       // pixel height of one half
  halfW: number       // pixel width of one half (excluding F column)
  cols: { name: string; pts: number }[]  // columns in halves only (no F)
  finalCard: BracketCard | null
}

function buildBracket(
  rounds: DbRound[],
  matches: DbMatch[],
  draw: 'mens' | 'womens',
  tipMap: Record<string, string>,
  now: Date,
): BuiltBracket {
  const orderedRounds = [...rounds].sort((a, b) => a.sort_order - b.sort_order)
  if (orderedRounds.length === 0) return { cards: [], halfSlots: 0, halfH: 0, halfW: 0, cols: [], finalCard: null }

  const filteredMatches = matches.filter(m => m.draw === draw)
  if (filteredMatches.length === 0) return { cards: [], halfSlots: 0, halfH: 0, halfW: 0, cols: [], finalCard: null }

  // Determine bracket size from deepest filled R0 position
  let firstRoundSlots = 0
  orderedRounds.forEach((r, ri) => {
    for (const m of filteredMatches.filter(x => x.round_id === r.id)) {
      const pos = m.bracket_position ?? -1
      if (pos < 0) continue
      firstRoundSlots = Math.max(firstRoundSlots, (pos + 1) * Math.pow(2, ri))
    }
  })
  if (firstRoundSlots === 0) {
    // No bracket_position metadata; fall back to count in the first round with matches.
    const firstWith = orderedRounds.find(r => filteredMatches.some(m => m.round_id === r.id))
    firstRoundSlots = firstWith ? filteredMatches.filter(m => m.round_id === firstWith.id).length : 0
  }

  const halfSlots = Math.floor(firstRoundSlots / 2)

  // Final = last round IF it has exactly 1 match; otherwise treat all rounds as halves
  const finalRound = orderedRounds[orderedRounds.length - 1]
  const finalMatch = finalRound && filteredMatches.find(m => m.round_id === finalRound.id)
  const hasFinal = !!finalMatch && filteredMatches.filter(m => m.round_id === finalRound.id).length <= 1
  const halfRounds = hasFinal ? orderedRounds.slice(0, -1) : orderedRounds

  const cols = halfRounds.map(r => ({ name: r.name, pts: r.points_per_correct_tip }))

  const cards: BracketCard[] = []
  halfRounds.forEach((round, col) => {
    const inRound = filteredMatches.filter(m => m.round_id === round.id)
    for (const m of inRound) {
      const pos = m.bracket_position
      if (pos === null) continue
      const slotsAtCol = Math.max(1, halfSlots / Math.pow(2, col))
      const half: 'top' | 'bottom' = pos < slotsAtCol ? 'top' : 'bottom'
      const positionInHalf = half === 'top' ? pos : pos - slotsAtCol

      const isLocked = new Date(m.scheduled_start) <= now
      const isResulted = !!m.winner
      const isLive = isLocked && !isResulted

      cards.push({
        id: m.id, col, positionInHalf, half,
        roundName: round.name,
        player1: m.player1_name, player2: m.player2_name,
        winner: m.winner,
        score: m.score,
        noPoints: m.no_points,
        myPick: tipMap[m.id] ?? null,
        isLocked, isResulted, isLive,
      })
    }
  })

  let finalCard: BracketCard | null = null
  if (hasFinal && finalMatch) {
    const isLocked = new Date(finalMatch.scheduled_start) <= now
    const isResulted = !!finalMatch.winner
    finalCard = {
      id: finalMatch.id, col: halfRounds.length, positionInHalf: 0, half: 'final',
      roundName: finalRound.name,
      player1: finalMatch.player1_name, player2: finalMatch.player2_name,
      winner: finalMatch.winner,
      score: finalMatch.score,
      noPoints: finalMatch.no_points,
      myPick: tipMap[finalMatch.id] ?? null,
      isLocked, isResulted, isLive: isLocked && !isResulted,
    }
  }

  // Half height/width
  const rowH = MH + GV
  const halfH = halfSlots > 0 ? halfSlots * rowH - GV : 0
  const halfW = cols.length * MW + Math.max(0, cols.length - 1) * GC
  return { cards, halfSlots, halfH, halfW, cols, finalCard }
}

export default function BracketView({
  tournament, rounds, matches, myTips,
}: Props) {
  const router = useRouter()
  const [draw, setDraw] = useState<'mens' | 'womens'>('mens')
  const [activeRoundName, setActiveRoundName] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])
  const hasWomens = matches.some(m => m.draw === 'womens')

  // Optimistic tip state so picks land instantly; rolled back per-match on error.
  const [tipMap, setTipMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(myTips.map(t => [t.match_id, t.predicted_winner]))
  )
  const [pendingPicks, setPendingPicks] = useState<Record<string, 'player1' | 'player2'>>({})
  const [, startTransition] = useTransition()

  const roundNameById = useMemo(
    () => Object.fromEntries(rounds.map(r => [r.id, r.name])),
    [rounds]
  )

  function placePick(matchId: string, roundName: string, pick: 'player1' | 'player2') {
    if (tipMap[matchId] === pick || pendingPicks[matchId] === pick) return
    const prevForMatch = tipMap[matchId]
    setPendingPicks(p => ({ ...p, [matchId]: pick }))
    setTipMap(m => ({ ...m, [matchId]: pick }))
    startTransition(async () => {
      const result = await submitTip(tournament.slug, roundName, matchId, pick)
      if (result?.error) {
        setTipMap(m => {
          const next = { ...m }
          if (prevForMatch === undefined) delete next[matchId]
          else next[matchId] = prevForMatch
          return next
        })
        console.error(result.error)
      } else {
        router.refresh()
      }
      setPendingPicks(p => {
        const next = { ...p }
        delete next[matchId]
        return next
      })
    })
  }

  const orderedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.sort_order - b.sort_order),
    [rounds]
  )

  const built = useMemo(() => buildBracket(rounds, matches, draw, tipMap, now), [rounds, matches, draw, tipMap, now])
  const drawMatches = useMemo(() => matches.filter(m => m.draw === draw), [matches, draw])

  // Current round: latest round with any started match (locked or resulted)
  const currentRound = useMemo(() => {
    // The deepest round that has actually begun. A round can pass its start
    // time while both slots are still 'TBD' — the bracket hasn't advanced into
    // it yet — and landing there shows an empty card, so it only counts once
    // it holds real players.
    let found: DbRound | null = null
    let startedButEmpty: DbRound | null = null
    for (const r of orderedRounds) {
      const rm = drawMatches.filter(m => m.round_id === r.id)
      const begun = rm.some(m => new Date(m.scheduled_start) <= now || m.winner)
      if (!begun) continue
      startedButEmpty = r
      if (rm.some(m => isPickableName(m.player1_name) || isPickableName(m.player2_name))) found = r
    }
    return found ?? startedButEmpty ?? orderedRounds[0] ?? null
  }, [orderedRounds, drawMatches, now])

  // Round state per name (for the labels strip)
  const roundStates: Record<string, 'done' | 'live' | 'pending'> = useMemo(() => {
    const out: Record<string, 'done' | 'live' | 'pending'> = {}
    for (const r of orderedRounds) {
      const rm = drawMatches.filter(m => m.round_id === r.id)
      if (rm.length === 0) { out[r.name] = 'pending'; continue }
      const resulted = rm.filter(m => m.winner).length
      const started = rm.some(m => new Date(m.scheduled_start) <= now)
      if (resulted === rm.length) out[r.name] = 'done'
      else if (started || resulted > 0) out[r.name] = 'live'
      else out[r.name] = 'pending'
    }
    return out
  }, [orderedRounds, drawMatches, now])

  // ─── "Your picks" alive/out, for the current round ──────────────────
  const currentRoundMatches = currentRound
    ? drawMatches.filter(m => m.round_id === currentRound.id)
    : []
  const aliveOut = useMemo(() => {
    const alive: string[] = []
    const out: string[] = []
    for (const m of currentRoundMatches) {
      const tip = tipMap[m.id]
      if (!tip) continue
      const pickedName = stripSeed(tip === 'player1' ? m.player1_name : m.player2_name)
      if (m.winner) {
        if (m.winner === tip) alive.push(pickedName)
        else out.push(pickedName)
      } else {
        alive.push(pickedName)
      }
    }
    return { alive, out }
  }, [currentRoundMatches, tipMap])

  // ─── Mobile: round selector + match list ────────────────────────────
  const mobileActive = orderedRounds.find(r => r.name === activeRoundName) ?? currentRound
  const mobileMatches = mobileActive
    ? drawMatches.filter(m => m.round_id === mobileActive.id).sort((a, b) => {
        if (a.bracket_position !== null && b.bracket_position !== null) return a.bracket_position - b.bracket_position
        return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
      })
    : []

  // ─── Compose banner copy ────────────────────────────────────────────
  const drawLabel = draw === 'mens' ? "Men's singles" : "Women's singles"
  const firstRoundName = built.cols[0]?.name ?? 'the draw'
  const finalLabel = built.finalCard ? 'the Final' : 'the latest round'


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
          className="pointer-events-none absolute -top-5 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
          style={{ fontSize: 'clamp(120px, 22vw, 180px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}
        >
          DRAW
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            The draw · {tournament.name}
          </div>
          <h1 className="mt-2 font-serif text-[28px] font-bold leading-[1] md:text-[40px]">
            {drawLabel} — {firstRoundName} to {finalLabel}.
          </h1>
        </div>
      </section>

      {/* Controls — draw toggle + alive summary */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--rule)] px-5 py-4 md:px-8">
        {hasWomens ? (
          <div className="inline-flex overflow-hidden rounded-[10px]" style={{ border: '1px solid #D6DEF0' }}>
            {(['mens', 'womens'] as const).map(d => {
              const on = draw === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDraw(d)}
                  className="tp-tap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ background: on ? 'var(--brick)' : 'transparent', color: on ? '#fff' : 'var(--ink-2)' }}
                >
                  {d === 'mens' ? "Men's" : "Women's"}
                </button>
              )
            })}
          </div>
        ) : <div />}

        {(aliveOut.alive.length > 0 || aliveOut.out.length > 0) && (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            {aliveOut.alive.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--olive)]">
                  {aliveOut.alive.length} alive
                </div>
                <div className="mt-0.5 text-[14px] text-[var(--ink)]">{aliveOut.alive.join(', ')}.</div>
              </div>
            )}
            {aliveOut.out.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                  {aliveOut.out.length} out
                </div>
                <div
                  className="mt-0.5 text-[13px] text-[var(--ink-3)]"
                  style={{ textDecoration: 'line-through rgba(136,146,184,0.7) 1px', textUnderlineOffset: 3 }}
                >
                  {aliveOut.out.join(', ')}.
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Desktop: full bracket — top half / Final / bottom half */}
      <section className="tp-scroll hidden flex-1 overflow-x-auto px-4 py-8 md:block md:px-8">
        {built.cards.length === 0 ? (
          <div className="py-12 text-center text-[14px] text-[var(--ink-2)]">
            No {drawLabel.toLowerCase()} fixtures yet.
          </div>
        ) : (
          <div className="tp-scroll overflow-x-auto pb-3">
            <div style={{ width: built.halfW, margin: '0 auto', position: 'relative' }}>
              {/* Top half */}
              <div className="relative" style={{ height: built.halfH }}>
                <HalfLabel text={`Top half · into ${built.cols[built.cols.length - 1]?.name ?? 'SF'}`} />
                <HalfConnectors halfH={built.halfH} halfW={built.halfW} cards={built.cards} half="top" cols={built.cols.length} />
                {built.cards.filter(c => c.half === 'top').map(c => (
                  <div key={c.id} style={{ position: 'absolute', left: c.col * (MW + GC), top: yForHalfMatch(c.positionInHalf, c.col) - MH / 2 }}>
                    <MatchCard card={c} pendingSide={pendingPicks[c.id] ?? null} onPick={side => placePick(c.id, c.roundName, side)} />
                  </div>
                ))}
              </div>

              {/* The Final, centred */}
              {built.finalCard && (
                <div className="relative my-10">
                  <div className="absolute inset-x-0 top-1/2 h-px" style={{ borderTop: '1px solid var(--rule)' }} />
                  <div className="relative mx-auto flex flex-col items-center gap-2.5">
                    <div className="bg-[var(--paper)] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">
                      · The Final · {orderedRounds.find(r => r.name === 'F')?.points_per_correct_tip ?? 64}pt
                    </div>
                    <div className="bg-[var(--paper)] px-3">
                      <MatchCard card={built.finalCard} big pendingSide={pendingPicks[built.finalCard.id] ?? null} onPick={side => placePick(built.finalCard!.id, built.finalCard!.roundName, side)} />
                    </div>
                    <div className="bg-[var(--paper)] px-3 text-[12px] text-[var(--ink-3)]">
                      Worth {orderedRounds.find(r => r.name === 'F')?.points_per_correct_tip ?? 64} points · tiebreaker settles a dead heat.
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom half */}
              <div className="relative mt-1.5" style={{ height: built.halfH }}>
                <HalfLabel text={`Bottom half · into ${built.cols[built.cols.length - 1]?.name ?? 'SF'}`} />
                <HalfConnectors halfH={built.halfH} halfW={built.halfW} cards={built.cards} half="bottom" cols={built.cols.length} />
                {built.cards.filter(c => c.half === 'bottom').map(c => (
                  <div key={c.id} style={{ position: 'absolute', left: c.col * (MW + GC), top: yForHalfMatch(c.positionInHalf, c.col) - MH / 2 }}>
                    <MatchCard card={c} pendingSide={pendingPicks[c.id] ?? null} onPick={side => placePick(c.id, c.roundName, side)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Mobile: round navigator + match list */}
      <section className="flex-1 md:hidden">
        {orderedRounds.length === 0 ? (
          <div className="py-12 text-center text-[14px] text-[var(--ink-2)]">No fixtures yet.</div>
        ) : (
          <>
            <div className="tp-scroll flex gap-2 overflow-x-auto border-b border-[var(--rule)] px-5 py-3">
              {orderedRounds.map(r => {
                const isActive = (mobileActive?.id ?? null) === r.id
                const isPending = roundStates[r.name] === 'pending'
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRoundName(r.name)}
                    className="tp-tap shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{
                      border: `1px solid ${isActive ? 'var(--brick)' : 'var(--rule)'}`,
                      background: isActive ? 'var(--brick)' : 'var(--paper-2)',
                      color: isActive ? '#fff' : isPending ? 'var(--ink-3)' : 'var(--ink)',
                    }}
                  >
                    {r.name}
                  </button>
                )
              })}
            </div>

            {mobileActive && (
              <section className="px-5 pb-8 pt-4">
                <div className="mb-3 flex items-end justify-between border-b-2 border-[var(--ink)] pb-2.5">
                  <h2 className="m-0 font-serif text-[20px] font-bold uppercase tracking-[0.02em]">
                    {ROUND_LONG[mobileActive.name] ?? mobileActive.name}
                  </h2>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                    {mobileMatches.length} match{mobileMatches.length === 1 ? '' : 'es'}
                  </span>
                </div>
                {mobileMatches.length === 0 ? (
                  <div className="py-6 text-[14px] text-[var(--ink-2)]">No fixtures listed yet.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {mobileMatches.map(m => {
                      const tip = tipMap[m.id]
                      const isResulted = !!m.winner
                      const isLocked = new Date(m.scheduled_start) <= now
                      const wonP1 = m.winner === 'player1'
                      const wonP2 = m.winner === 'player2'
                      const myP1 = tip === 'player1'
                      const myP2 = tip === 'player2'
                      const isLive = isLocked && !isResulted
                      const isOpen = !isLocked && !isResulted
                      const roundName = roundNameById[m.round_id] ?? mobileActive.name
                      let statusEl: React.ReactNode = null
                      if (isLive) statusEl = <span className="rounded-full bg-[var(--spark)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--spark-ink)]">Live</span>
                      else if (isResulted) statusEl = (
                        <span className="text-[12px] text-[var(--olive)]">
                          {stripSeed(wonP1 ? m.player1_name : m.player2_name)} through
                          {m.score && <span className="ml-1.5 tabular-nums text-[var(--ink-3)]">{m.score}</span>}
                          {m.no_points && <span className="ml-1.5 text-[var(--ink-3)]">· no points</span>}
                        </span>
                      )
                      else if (tip) statusEl = <span className="text-[12px] text-[var(--ink-3)]">Your call: {stripSeed(tip === 'player1' ? m.player1_name : m.player2_name)}.</span>
                      else statusEl = <span className="text-[12px] text-[var(--ink-3)]">Tap a name to pick.</span>
                      return (
                        <div key={m.id} style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 16, padding: '14px 16px' }}>
                          {isOpen ? (
                            <div className="grid grid-cols-2 gap-3">
                              <MobilePickButton name={m.player1_name} myPick={myP1} pending={pendingPicks[m.id] === 'player1'} onPick={() => placePick(m.id, roundName, 'player1')} />
                              <MobilePickButton name={m.player2_name} myPick={myP2} pending={pendingPicks[m.id] === 'player2'} onPick={() => placePick(m.id, roundName, 'player2')} />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <MobileStaticSide name={m.player1_name} myPick={myP1} won={wonP1} lost={isResulted && !wonP1} resulted={isResulted} score={wonP1 ? m.score : null} />
                              <MobileStaticSide name={m.player2_name} myPick={myP2} won={wonP2} lost={isResulted && !wonP2} resulted={isResulted} score={wonP2 ? m.score : null} />
                            </div>
                          )}
                          <div className="mt-2.5">{statusEl}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>

      <TabBar tournamentSlug={tournament.slug} />
    </main>
  )
}

// ─── Small primitives ─────────────────────────────────────────────

function HalfLabel({ text }: { text: string }) {
  return (
    <div className="absolute left-0 top-[-24px] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">
      {text}
    </div>
  )
}

function HalfConnectors({
  halfH, halfW, cards, half, cols,
}: { halfH: number; halfW: number; cards: BracketCard[]; half: 'top' | 'bottom'; cols: number }) {
  const byKey = new Map<string, BracketCard>()
  for (const c of cards) byKey.set(`${c.half}-${c.col}-${c.positionInHalf}`, c)

  const paths: string[] = []
  for (let col = 0; col < cols - 1; col++) {
    const slotsAtCol = cards.filter(c => c.half === half && c.col === col).length
    for (let pPos = 0; pPos < Math.ceil(slotsAtCol / 2); pPos++) {
      const parentKey = `${half}-${col + 1}-${pPos}`
      const a = byKey.get(`${half}-${col}-${pPos * 2}`)
      const b = byKey.get(`${half}-${col}-${pPos * 2 + 1}`)
      const p = byKey.get(parentKey)
      if (!p) continue
      const x1 = col * (MW + GC) + MW
      const x2 = (col + 1) * (MW + GC)
      const midX = x1 + (x2 - x1) / 2
      const yMid = yForHalfMatch(pPos, col + 1)
      if (a) {
        const yTop = yForHalfMatch(pPos * 2, col)
        paths.push(`M ${x1} ${yTop} L ${midX} ${yTop}`)
        paths.push(`M ${midX} ${yTop} L ${midX} ${yMid}`)
      }
      if (b) {
        const yBot = yForHalfMatch(pPos * 2 + 1, col)
        paths.push(`M ${x1} ${yBot} L ${midX} ${yBot}`)
        paths.push(`M ${midX} ${yBot} L ${midX} ${yMid}`)
      }
      paths.push(`M ${midX} ${yMid} L ${x2} ${yMid}`)
    }
  }

  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0" width={halfW} height={halfH}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(11,20,55,0.16)" strokeWidth="1.5" />
      ))}
    </svg>
  )
}

function isPickableName(name: string) {
  const display = stripSeed(name)
  return !!display && display !== '—' && display.toUpperCase() !== 'TBD'
}

function MatchCard({
  card, big, onPick, pendingSide,
}: {
  card: BracketCard
  big?: boolean
  onPick?: (side: 'player1' | 'player2') => void
  pendingSide?: 'player1' | 'player2' | null
}) {
  const p1Won = card.winner === 'player1'
  const p2Won = card.winner === 'player2'
  const isResulted = card.isResulted
  const isOpen = !card.isLocked && !isResulted

  const border = big ? 'var(--brick)' : card.isLive ? 'var(--brick)' : '#D6DEF0'
  const shadow = big ? '0 14px 30px -20px rgba(0,48,143,0.55)' : '0 6px 14px -12px rgba(11,20,55,0.4)'

  return (
    <div
      style={{
        width: MW,
        border: `${big ? 1.5 : 1}px solid ${border}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--paper-2)',
        boxShadow: shadow,
        position: 'relative',
      }}
    >
      {card.isLive && (
        <div className="absolute right-1.5 top-1.5 rounded-full bg-[var(--spark)] px-1.5 text-[8px] font-semibold uppercase leading-[14px] tracking-[0.12em] text-[var(--spark-ink)]">
          Live
        </div>
      )}
      <BracketRow
        name={card.player1}
        won={p1Won}
        lost={isResulted && !p1Won}
        picked={card.myPick === 'player1'}
        resulted={isResulted}
        score={p1Won ? card.score : null}
        pending={pendingSide === 'player1'}
        big={!!big}
        isFirst
        onPick={isOpen && onPick && isPickableName(card.player1) ? () => onPick('player1') : undefined}
      />
      <BracketRow
        name={card.player2}
        won={p2Won}
        lost={isResulted && !p2Won}
        picked={card.myPick === 'player2'}
        resulted={isResulted}
        score={p2Won ? card.score : null}
        pending={pendingSide === 'player2'}
        big={!!big}
        onPick={isOpen && onPick && isPickableName(card.player2) ? () => onPick('player2') : undefined}
      />
    </div>
  )
}

function BracketRow({
  name, won, lost, picked, resulted, score, pending, big, isFirst, onPick,
}: {
  name: string
  won: boolean
  lost: boolean
  picked: boolean
  resulted: boolean
  score?: string | null
  pending?: boolean
  big: boolean
  isFirst?: boolean
  onPick?: () => void
}) {
  const display = stripSeed(name)
  const seed = parseSeed(name)
  const nameColor = won ? 'var(--olive)' : picked && !resulted ? 'var(--brick)' : 'var(--ink)'
  const inner = (
    <>
      <span className="flex min-w-0 flex-1 items-baseline gap-1">
        <span
          className="truncate"
          style={{ fontWeight: picked || won ? 700 : 400, fontSize: big ? 14 : 13, lineHeight: 1.1, color: nameColor }}
        >
          {display || '—'}
        </span>
        {seed && <span className="text-[10px] text-[var(--ink-3)]">[{seed}]</span>}
      </span>
      {pending ? (
        <svg className="size-2.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
          <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : won && score ? (
        // The card is a fixed 188px and the row height is pinned, so the name
        // can't wrap — a four-set score would otherwise truncate it to
        // "Alex de M…". Who won is the primary information, so cap the score
        // and keep the full string on hover.
        <span title={score} className="max-w-[45%] truncate text-[9px] tabular-nums text-[var(--ink-3)]">{score}</span>
      ) : won ? (
        <span className="shrink-0 text-[10px] font-semibold text-[var(--olive)]">✓</span>
      ) : picked && !resulted ? (
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--blue)]">PICK</span>
      ) : picked && lost ? (
        <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--down)]">pick</span>
      ) : null}
    </>
  )

  const rowStyle: React.CSSProperties = {
    padding: `${big ? 7 : 5}px 10px`,
    borderBottom: isFirst ? '1px solid var(--rule)' : 'none',
    opacity: lost ? 0.5 : 1,
    background: won ? '#E7F3EC' : picked && !resulted ? '#EEF2FC' : 'transparent',
    // Pinned so the rendered card matches MH exactly (border-box, so the
    // divider border is included). The final card sizes to its content.
    ...(big ? { minHeight: 24 } : { height: ROW_H }),
  }

  if (onPick) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-pressed={picked}
        aria-label={`Pick ${display}`}
        className="tp-tap flex w-full items-center justify-between gap-1.5 text-left"
        style={rowStyle}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-1.5" style={rowStyle}>
      {inner}
    </div>
  )
}

function MobilePickButton({
  name, myPick, pending, onPick,
}: { name: string; myPick: boolean; pending: boolean; onPick: () => void }) {
  const display = stripSeed(name)
  const seed = parseSeed(name)
  const pickable = isPickableName(name)
  return (
    <button
      type="button"
      onClick={pickable ? onPick : undefined}
      disabled={!pickable}
      aria-pressed={myPick}
      aria-label={pickable ? `Pick ${display}` : undefined}
      className="pick-side tp-tap flex min-h-[52px] items-center justify-between gap-2 text-left disabled:opacity-50"
      style={{
        padding: '13px 15px',
        borderRadius: 12,
        border: `1.5px solid ${myPick ? 'var(--brick)' : '#D6DEF0'}`,
        background: myPick ? '#EEF2FC' : 'var(--paper-3)',
      }}
    >
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="break-words" style={{ fontSize: 16, fontWeight: myPick ? 700 : 500, color: myPick ? 'var(--brick)' : 'var(--ink)' }}>{display || '—'}</span>
        {seed && <span className="shrink-0 text-[11px] text-[var(--ink-3)]">[{seed}]</span>}
      </span>
      {pending ? (
        <svg className="size-3.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
          <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : myPick ? (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--brick)]">
          <span className="pick-tick-full">✓ pick</span>
          <span className="pick-tick-short" aria-hidden>✓</span>
        </span>
      ) : null}
    </button>
  )
}

function MobileStaticSide({
  name, myPick, won, lost, resulted, score,
}: { name: string; myPick: boolean; won: boolean; lost: boolean; resulted: boolean; score?: string | null }) {
  const display = stripSeed(name)
  const seed = parseSeed(name)
  const border = won ? 'rgba(28,122,75,0.5)' : myPick ? 'var(--brick)' : '#D6DEF0'
  const bg = won ? '#E7F3EC' : 'var(--paper-3)'
  const nameColor = won ? 'var(--olive)' : lost ? 'var(--ink-3)' : myPick ? 'var(--brick)' : 'var(--ink)'
  return (
    <div
      className="pick-side flex items-center justify-between gap-2"
      style={{ padding: '13px 15px', borderRadius: 12, border: `1.5px solid ${border}`, background: bg, opacity: lost ? 0.6 : 1 }}
    >
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="break-words" style={{ fontSize: 16, fontWeight: won || myPick ? 700 : 500, color: nameColor }}>{display || '—'}</span>
        {seed && <span className="shrink-0 text-[11px] text-[var(--ink-3)]">[{seed}]</span>}
      </span>
      {won && score ? (
        <span className="shrink-0 text-[11px] tabular-nums text-[var(--ink-3)]">{score}</span>
      ) : won ? (
        <span className="shrink-0 text-[12px] font-semibold text-[var(--olive)]">✓</span>
      ) : myPick ? (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--down)]">
          <span className="pick-tick-full">pick</span>
          <span className="pick-tick-short" aria-hidden>✓</span>
        </span>
      ) : null}
    </div>
  )
}
