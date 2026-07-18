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

const MW = 188
const MH = 38
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
    let found: DbRound | null = null
    for (const r of orderedRounds) {
      const rm = drawMatches.filter(m => m.round_id === r.id)
      if (rm.some(m => new Date(m.scheduled_start) <= now || m.winner)) found = r
    }
    return found ?? orderedRounds[0] ?? null
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
      <section className="relative z-10 overflow-hidden bg-[var(--brick)] px-4 py-5 text-[var(--paper)] md:px-8 md:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-3 -right-6 select-none whitespace-nowrap font-serif italic text-white/[0.07] md:-top-4 md:-right-8"
          style={{ fontSize: 'clamp(110px, 24vw, 200px)', lineHeight: 1, letterSpacing: '-0.04em' }}
        >
          DRAW
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] opacity-85 md:text-[10px]">
          The Draw · {tournament.name}
        </div>
        <h1 className="mt-1 font-serif text-[28px] leading-[1.04] tracking-tight md:text-[44px] md:mt-2">
          {drawLabel}, <span className="italic">{firstRoundName} to {finalLabel}.</span>
        </h1>
      </section>

      {/* Controls strip — draw toggle + round labels */}
      <section className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-3 md:px-8">
        {hasWomens ? (
          <div className="flex">
            {(['mens', 'womens'] as const).map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setDraw(d)}
                className="px-4 py-2 text-[10px] font-medium uppercase tracking-[0.18em] transition-colors"
                style={{
                  border: `1px solid ${draw === d ? 'var(--ink)' : 'var(--rule)'}`,
                  borderLeft: i === 0 ? `1px solid ${draw === d ? 'var(--ink)' : 'var(--rule)'}` : 'none',
                  background: draw === d ? 'var(--ink)' : 'transparent',
                  color: draw === d ? 'var(--paper)' : 'var(--ink-2)',
                }}
              >
                {d === 'mens' ? "Men's" : "Women's"}
              </button>
            ))}
          </div>
        ) : <div />}

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          {orderedRounds.map(r => {
            const state = roundStates[r.name]
            return (
              <span
                key={r.id}
                className="text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{
                  color: state === 'live' ? 'var(--brick)' : state === 'pending' ? 'var(--ink-3)' : 'var(--ink-2)',
                }}
              >
                {r.name}
                <span className="ml-1 font-serif italic normal-case tracking-normal text-[var(--ink-3)]">
                  · {r.points_per_correct_tip}pt
                </span>
              </span>
            )
          })}
        </div>
      </section>

      {/* Your picks summary */}
      {(aliveOut.alive.length > 0 || aliveOut.out.length > 0) && (
        <section className="relative z-10 flex flex-wrap items-baseline gap-x-6 gap-y-3 border-b border-[var(--rule)] px-4 py-4 md:px-8 md:py-5">
          {aliveOut.alive.length > 0 && (
            <div className="min-w-0 flex-1">
              <div className="tp-eyebrow tp-eyebrow--brick">
                Your picks · {aliveOut.alive.length} alive
              </div>
              <div className="mt-1.5 font-serif italic text-[14px] leading-[1.4] text-[var(--ink)] md:text-[16px]">
                {aliveOut.alive.join(', ')}.
              </div>
            </div>
          )}
          {aliveOut.out.length > 0 && (
            <div className="md:text-right">
              <div className="tp-eyebrow">{aliveOut.out.length} out</div>
              <div
                className="mt-1.5 font-serif italic text-[13px] leading-[1.4] text-[var(--ink-3)] md:text-[14px]"
                style={{ textDecoration: 'line-through var(--ink-3) 1px', textUnderlineOffset: 3 }}
              >
                {aliveOut.out.join(', ')}.
              </div>
            </div>
          )}
        </section>
      )}

      {/* Desktop: full bracket — top half / Final / bottom half */}
      <section className="relative z-10 hidden flex-1 px-4 py-6 md:block md:px-8 md:py-8">
        {built.cards.length === 0 ? (
          <div className="py-12 text-center font-serif italic text-[var(--ink-2)]">
            No {drawLabel.toLowerCase()} fixtures yet.
          </div>
        ) : (
          <div className="overflow-x-auto pb-3">
            <div style={{ width: built.halfW, margin: '0 auto', position: 'relative' }}>
              {/* Top half */}
              <div className="relative" style={{ height: built.halfH }}>
                <HalfLabel text={`Top half · into ${built.cols[built.cols.length - 1]?.name ?? 'SF'}`} />
                <HalfConnectors halfH={built.halfH} halfW={built.halfW} cards={built.cards} half="top" cols={built.cols.length} />
                {built.cards.filter(c => c.half === 'top').map(c => (
                  <div
                    key={c.id}
                    style={{
                      position: 'absolute',
                      left: c.col * (MW + GC),
                      top: yForHalfMatch(c.positionInHalf, c.col) - MH / 2,
                    }}
                  >
                    <MatchCard
                      card={c}
                      pendingSide={pendingPicks[c.id] ?? null}
                      onPick={side => placePick(c.id, c.roundName, side)}
                    />
                  </div>
                ))}
              </div>

              {/* The Final, centred */}
              {built.finalCard && (
                <div className="relative my-10">
                  <div className="absolute inset-x-0 top-1/2 h-px" style={{ borderTop: '1px dotted var(--rule)' }} />
                  <div className="relative mx-auto flex flex-col items-center gap-2.5">
                    <div
                      className="bg-[var(--paper)] px-3 text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--brick)]"
                    >
                      · The Final ·
                    </div>
                    <div className="bg-[var(--paper)] px-3">
                      <MatchCard
                        card={built.finalCard}
                        big
                        pendingSide={pendingPicks[built.finalCard.id] ?? null}
                        onPick={side => placePick(built.finalCard!.id, built.finalCard!.roundName, side)}
                      />
                    </div>
                    <div className="bg-[var(--paper)] px-3 font-serif italic text-[12px] text-[var(--ink-3)]">
                      Worth {orderedRounds.find(r => r.name === 'F')?.points_per_correct_tip ?? 64} points · earliest predicted total games wins ties.
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom half */}
              <div className="relative mt-1.5" style={{ height: built.halfH }}>
                <HalfLabel text={`Bottom half · into ${built.cols[built.cols.length - 1]?.name ?? 'SF'}`} />
                <HalfConnectors halfH={built.halfH} halfW={built.halfW} cards={built.cards} half="bottom" cols={built.cols.length} />
                {built.cards.filter(c => c.half === 'bottom').map(c => (
                  <div
                    key={c.id}
                    style={{
                      position: 'absolute',
                      left: c.col * (MW + GC),
                      top: yForHalfMatch(c.positionInHalf, c.col) - MH / 2,
                    }}
                  >
                    <MatchCard
                      card={c}
                      pendingSide={pendingPicks[c.id] ?? null}
                      onPick={side => placePick(c.id, c.roundName, side)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Mobile: round navigator + match list */}
      <section className="relative z-10 flex-1 md:hidden">
        {orderedRounds.length === 0 ? (
          <div className="py-12 text-center font-serif italic text-[var(--ink-2)]">
            No fixtures yet.
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto border-b border-[var(--rule)] px-4 py-3">
              {orderedRounds.map(r => {
                const isActive = (mobileActive?.id ?? null) === r.id
                const state = roundStates[r.name]
                const isPending = state === 'pending'
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRoundName(r.name)}
                    className="shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] transition-colors"
                    style={{
                      border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                      background: isActive ? 'var(--ink)' : 'transparent',
                      color: isActive ? 'var(--paper)' : isPending ? 'var(--ink-3)' : 'var(--ink)',
                      opacity: isPending ? 0.65 : 1,
                    }}
                  >
                    {r.name}
                  </button>
                )
              })}
            </div>

            {mobileActive && (
              <section className="px-4 pb-8 pt-4">
                <div className="mb-1 border-b-2 border-[var(--ink)] pb-2">
                  <h2 className="m-0 font-serif text-[20px] tracking-tight">
                    {mobileActive.name} · {mobileMatches.length} match{mobileMatches.length === 1 ? '' : 'es'}
                  </h2>
                </div>
                {mobileMatches.length === 0 ? (
                  <div className="py-6 font-serif italic text-[var(--ink-2)]">
                    No fixtures listed yet.
                  </div>
                ) : (
                  mobileMatches.map((m, i) => {
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
                    return (
                      <div
                        key={m.id}
                        className="py-3"
                        style={{
                          borderBottom: i === mobileMatches.length - 1 ? 'none' : '1px dotted var(--rule)',
                        }}
                      >
                        {isOpen ? (
                          <div className="flex items-stretch gap-1.5">
                            <MobilePickButton
                              name={m.player1_name}
                              myPick={myP1}
                              pending={pendingPicks[m.id] === 'player1'}
                              onPick={() => placePick(m.id, roundName, 'player1')}
                            />
                            <span className="self-center font-serif italic text-[12px] text-[var(--ink-3)]">v</span>
                            <MobilePickButton
                              name={m.player2_name}
                              myPick={myP2}
                              pending={pendingPicks[m.id] === 'player2'}
                              onPick={() => placePick(m.id, roundName, 'player2')}
                            />
                          </div>
                        ) : (
                          <div className="font-serif text-[15px] leading-[1.2]">
                            <MobilePlayer
                              name={m.player1_name}
                              myPick={myP1}
                              won={wonP1}
                              lost={isResulted && !wonP1}
                              resulted={isResulted}
                            />
                            <span className="mx-1.5 italic text-[var(--ink-3)]">v</span>
                            <MobilePlayer
                              name={m.player2_name}
                              myPick={myP2}
                              won={wonP2}
                              lost={isResulted && !wonP2}
                              resulted={isResulted}
                            />
                          </div>
                        )}
                        <div
                          className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em]"
                          style={{
                            color: isLive ? 'var(--brick)' : isResulted ? 'var(--olive)' : 'var(--ink-3)',
                          }}
                        >
                          {isLive
                            ? '· Live'
                            : isResulted
                            ? <>
                                {stripSeed(wonP1 ? m.player1_name : m.player2_name)} into next
                                {m.score && <span className="ml-1.5 normal-case tracking-normal font-serif italic text-[11px] text-[var(--ink-2)]">{m.score}</span>}
                                {m.no_points && <span className="ml-1.5 text-[var(--ink-3)]">· no points</span>}
                              </>
                            : tip
                            ? <>your call: {stripSeed(tip === 'player1' ? m.player1_name : m.player2_name)}</>
                            : 'tap a player to tip'}
                        </div>
                      </div>
                    )
                  })
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
    <div
      className="absolute left-0 top-[-22px] text-[9px] font-medium uppercase tracking-[0.22em] text-[var(--ink-3)]"
    >
      {text}
    </div>
  )
}

function HalfConnectors({
  halfH, halfW, cards, half, cols,
}: { halfH: number; halfW: number; cards: BracketCard[]; half: 'top' | 'bottom'; cols: number }) {
  // For each card with a parent in this half, draw a connector to the parent.
  // We need a stable lookup of cards by half/col/positionInHalf.
  const byKey = new Map<string, BracketCard>()
  for (const c of cards) byKey.set(`${c.half}-${c.col}-${c.positionInHalf}`, c)

  const paths: string[] = []
  for (let col = 0; col < cols - 1; col++) {
    const slotsAtCol = cards.filter(c => c.half === half && c.col === col).length
    // Iterate parent slots in the next column
    for (let pPos = 0; pPos < Math.ceil(slotsAtCol / 2); pPos++) {
      const childA = `${half}-${col}-${pPos * 2}`
      const childB = `${half}-${col}-${pPos * 2 + 1}`
      const parentKey = `${half}-${col + 1}-${pPos}`
      const a = byKey.get(childA)
      const b = byKey.get(childB)
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
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0"
      width={halfW}
      height={halfH}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(21,35,27,0.18)" strokeWidth="1" strokeDasharray="2 3" />
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

  return (
    <div
      style={{
        width: MW,
        height: big ? MH + 16 : MH,
        border: `1px solid ${card.isLive ? 'var(--brick)' : isOpen ? 'rgba(21,35,27,0.35)' : 'var(--rule)'}`,
        background: 'var(--paper)',
        position: 'relative',
      }}
    >
      {card.isLive && (
        <div
          className="absolute left-2 top-[-7px] bg-[var(--brick)] px-1.5 text-[7px] font-medium uppercase leading-[12px] tracking-[0.18em] text-[var(--paper)]"
        >
          Live
        </div>
      )}
      {isResulted && card.noPoints && (
        <div
          className="absolute right-2 top-[-7px] bg-[var(--paper)] px-1.5 text-[7px] font-medium uppercase leading-[12px] tracking-[0.18em] text-[var(--ink-3)]"
          style={{ border: '1px solid var(--rule)' }}
        >
          No points
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
  const inner = (
    <>
      <div className="flex min-w-0 items-baseline gap-1">
        <span
          className="truncate"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: picked || won ? 500 : 400,
            fontSize: big ? 14 : 12,
            lineHeight: 1.1,
            color: won ? 'var(--olive)' : 'var(--ink)',
            textDecoration: picked && !resulted ? 'underline var(--brick) 1.5px' : 'none',
            textUnderlineOffset: 3,
          }}
        >
          {display || '—'}
        </span>
        {seed && (
          <span className="font-serif italic text-[9px] text-[var(--ink-3)]">[{seed}]</span>
        )}
      </div>
      {pending ? (
        <svg className="size-2.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
          <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : won && score ? (
        <span className="shrink-0 whitespace-nowrap font-serif italic text-[8px] tabular-nums text-[var(--ink-2)]">{score}</span>
      ) : won ? (
        <span className="text-[9px] font-medium text-[var(--olive)]">✓</span>
      ) : picked && lost ? (
        <span className="text-[7px] font-medium uppercase tracking-[0.18em] text-[var(--brick)]">pick</span>
      ) : null}
    </>
  )

  const rowStyle: React.CSSProperties = {
    padding: `${big ? 5 : 3}px 8px`,
    borderBottom: isFirst ? '1px dotted var(--rule)' : 'none',
    opacity: lost ? 0.45 : 1,
    background: won ? 'rgba(0,100,60,0.07)' : 'transparent',
    minHeight: big ? 22 : 17,
  }

  if (onPick) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-pressed={picked}
        aria-label={`Pick ${display}`}
        className="flex w-full cursor-pointer items-center justify-between gap-1.5 px-2 text-left transition-colors hover:bg-[rgba(0,100,60,0.08)] active:scale-[0.99]"
        style={rowStyle}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-1.5 px-2" style={rowStyle}>
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
      // min-h-[44px] keeps the tap target at the mobile minimum.
      className="flex min-h-[44px] flex-1 items-center justify-between gap-1.5 px-2.5 text-left transition-colors active:scale-[0.99] disabled:opacity-50"
      style={{
        border: `1px solid ${myPick ? 'var(--brick)' : 'var(--rule)'}`,
        background: myPick ? 'rgba(0,100,60,0.06)' : 'transparent',
      }}
    >
      <span className="flex min-w-0 items-baseline gap-1 font-serif text-[15px] leading-[1.2]">
        <span className="truncate" style={{ fontWeight: myPick ? 500 : 400 }}>{display || '—'}</span>
        {seed && <span className="font-serif italic text-[10px] text-[var(--ink-3)]">[{seed}]</span>}
      </span>
      {pending ? (
        <svg className="size-3 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
          <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : myPick ? (
        <span className="shrink-0 text-[11px] font-bold text-[var(--brick)]">✓</span>
      ) : null}
    </button>
  )
}

function MobilePlayer({
  name, myPick, won, lost, resulted,
}: { name: string; myPick: boolean; won: boolean; lost: boolean; resulted: boolean }) {
  const display = stripSeed(name)
  const seed = parseSeed(name)
  return (
    <span
      style={{
        fontWeight: myPick ? 500 : 400,
        color: won ? 'var(--olive)' : resulted ? 'var(--ink-3)' : 'var(--ink)',
        textDecoration: myPick && !resulted ? 'underline var(--brick) 1.5px' : 'none',
        textUnderlineOffset: 3,
        opacity: lost ? 0.55 : 1,
      }}
    >
      {display}
      {seed && <span className="ml-1 font-serif italic text-[10px] text-[var(--ink-3)]">[{seed}]</span>}
    </span>
  )
}
