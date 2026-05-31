'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TabBar } from '@/components/TabBar'
import { submitTip } from '../round/[name]/actions'

export interface PicksRound {
  id: string
  name: string
  points_per_correct_tip: number
  sort_order: number
}

export interface PicksMatch {
  id: string
  round_id: string
  player1_name: string
  player2_name: string
  scheduled_start: string
  winner: string | null
  draw: string
}

interface Tournament {
  name: string
  slug: string
}

interface Props {
  tournament: Tournament
  rounds: PicksRound[]
  matches: PicksMatch[]
  tipMap: Record<string, string>
}

const ROUND_LONG: Record<string, string> = {
  R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
  R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'The Final',
}

type RoundState = 'done' | 'live' | 'pending'

interface RoundMeta {
  round: PicksRound
  matches: PicksMatch[]
  resulted: number
  picked: number
  earned: number
  state: RoundState
  hasMatches: boolean
}

type MatchState = 'correct' | 'wrong' | 'locked' | 'no-pick' | 'picked' | 'open'

function statusVerb(meta: RoundMeta, now: Date): string {
  const total = meta.matches.length
  if (!meta.hasMatches) return 'to come'
  if (meta.resulted === total && total > 0) return 'complete'
  if (meta.resulted > 0) return 'underway'
  if (meta.matches.some(m => new Date(m.scheduled_start) <= now)) return 'in progress'
  return 'to come'
}

function fmtLockTime(d: Date) {
  return d.toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: false })
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: false })
}

function fmtTimeOrDay(d: Date, now: Date) {
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return fmtClock(d)
  return fmtLockTime(d)
}

function stripSeed(name: string) {
  return name.replace(/\s*\[.*?\]/, '').trim()
}
function parseSeed(name: string): string | null {
  return name.match(/\[(\d+)\]/)?.[1] ?? null
}

function classifyMatch(m: PicksMatch, pick: string | undefined, now: Date): MatchState {
  const resulted = !!m.winner
  const locked = new Date(m.scheduled_start) <= now
  if (resulted && pick && m.winner === pick) return 'correct'
  if (resulted && pick && m.winner !== pick) return 'wrong'
  if (resulted && !pick) return 'wrong' // counts as a missed/wrong outcome
  if (!resulted && locked && pick) return 'locked'
  if (!resulted && locked && !pick) return 'no-pick'
  if (!resulted && !locked && pick) return 'picked'
  return 'open'
}

function cityFor(slug: string): string {
  const mapping: Record<string, string> = {
    'australian-open': 'MELBOURNE',
    'roland-garros': 'PARIS',
    'french-open': 'PARIS',
    'italian-open': 'ROMA',
    'madrid-open': 'MADRID',
    'wimbledon': 'LONDON',
    'us-open': 'NEW YORK',
    'miami-open': 'MIAMI',
  }
  for (const key of Object.keys(mapping)) if (slug.includes(key)) return mapping[key]
  return slug.split('-')[0]?.toUpperCase() ?? 'TIPPING POST'
}

export default function PicksView({ tournament, rounds, matches, tipMap: initialTipMap }: Props) {
  const router = useRouter()
  const now = useMemo(() => new Date(), [])
  const [tipMap, setTipMap] = useState(initialTipMap)
  const [, startTransition] = useTransition()
  // Track in-flight picks per match so saving one doesn't block picking others.
  const [pendingPicks, setPendingPicks] = useState<Record<string, 'player1' | 'player2'>>({})

  const orderedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.sort_order - b.sort_order),
    [rounds]
  )

  const meta: RoundMeta[] = useMemo(() => orderedRounds.map(round => {
    const rm = matches.filter(m => m.round_id === round.id)
    const resulted = rm.filter(m => m.winner).length
    const picked = rm.filter(m => tipMap[m.id]).length
    const earned = rm.reduce((sum, m) => {
      const t = tipMap[m.id]
      return sum + (m.winner && t === m.winner ? round.points_per_correct_tip : 0)
    }, 0)
    let state: RoundState = 'pending'
    if (rm.length > 0 && resulted === rm.length) state = 'done'
    else if (rm.length > 0 && (resulted > 0 || rm.some(m => new Date(m.scheduled_start) <= now))) state = 'live'
    return { round, matches: rm, resulted, picked, earned, state, hasMatches: rm.length > 0 }
  }), [orderedRounds, matches, tipMap, now])

  const liveRound =
    meta.find(m => m.state === 'live') ??
    meta.find(m => m.state === 'pending' && m.hasMatches) ??
    meta.find(m => m.state === 'done') ??
    meta[0] ?? null

  const [activeRoundId, setActiveRoundId] = useState<string | null>(liveRound?.round.id ?? null)
  const active = meta.find(m => m.round.id === activeRoundId) ?? liveRound

  const cityGhost = cityFor(tournament.slug)

  function placePick(matchId: string, roundName: string, pick: 'player1' | 'player2') {
    // Ignore no-op taps, but allow picking other matches while this one saves.
    if (tipMap[matchId] === pick || pendingPicks[matchId] === pick) return
    const prevForMatch = tipMap[matchId]
    setPendingPicks(p => ({ ...p, [matchId]: pick }))
    setTipMap(m => ({ ...m, [matchId]: pick }))
    startTransition(async () => {
      const result = await submitTip(tournament.slug, roundName, matchId, pick)
      if (result?.error) {
        // Roll back just this match, leaving other concurrent picks intact.
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

  // ─── Banner copy ────────────────────────────────────────────────────
  const bannerMeta = active ?? liveRound
  const bannerRoundName = bannerMeta?.round ? (ROUND_LONG[bannerMeta.round.name] ?? bannerMeta.round.name) : 'Round'
  const bannerVerb = bannerMeta ? statusVerb(bannerMeta, now) : 'to come'

  // First lock time across the active round
  const firstUpcoming = bannerMeta?.matches
    .filter(m => new Date(m.scheduled_start) > now)
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())[0]
  const locksAt = firstUpcoming ? fmtLockTime(new Date(firstUpcoming.scheduled_start)) : null

  const statusBits: string[] = []
  if (bannerMeta) {
    statusBits.push(`${bannerMeta.picked} of ${bannerMeta.matches.length} picked`)
    if (bannerMeta.resulted > 0) {
      const earned = bannerMeta.earned
      statusBits.push(`${bannerMeta.resulted} result${bannerMeta.resulted === 1 ? '' : 's'} so far · +${earned} points`)
    }
    if (locksAt) statusBits.push(`locks ${locksAt}`)
  }

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
      {bannerMeta && (
        <section className="relative z-10 overflow-hidden bg-[var(--brick)] px-4 py-5 text-[var(--paper)] md:px-8 md:py-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-3 -right-6 select-none whitespace-nowrap font-serif italic text-white/[0.07] md:-top-4 md:-right-8"
            style={{ fontSize: 'clamp(110px, 24vw, 220px)', lineHeight: 1, letterSpacing: '-0.04em' }}
          >
            {bannerMeta.round.name === 'R16' ? 'R16' : bannerMeta.round.name === 'R32' ? 'R32' : cityGhost}
          </div>
          <div className="text-[9px] uppercase tracking-[0.22em] opacity-85 md:text-[10px]">
            Your picks · {tournament.name}
          </div>
          <h1 className="mt-1 font-serif text-[30px] leading-[1.04] tracking-tight md:text-[48px] md:mt-2">
            {bannerRoundName} <span className="italic">{bannerVerb}.</span>
          </h1>
          {statusBits.length > 0 && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] text-white/90 md:gap-x-5 md:text-[13px]">
              {statusBits.map((bit, i) => (
                <span key={i} className="flex items-baseline gap-x-4">
                  {i > 0 && <span className="size-[3px] rounded-full bg-white/40" />}
                  <span>{bit}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Round nav tape */}
      {meta.length > 0 && (
        <section className="relative z-10 border-b border-[var(--rule)] px-4 py-4 md:px-8 md:py-5">
          <div className="flex gap-2.5 overflow-x-auto md:gap-3">
            {meta.map(m => {
              const isActive = m.round.id === active?.round.id
              const isPending = m.state === 'pending'
              return (
                <button
                  key={m.round.id}
                  type="button"
                  onClick={() => setActiveRoundId(m.round.id)}
                  className="shrink-0 min-w-[72px] px-3 py-2 text-left transition-colors md:min-w-[92px] md:px-4 md:py-2.5"
                  style={{
                    border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule)'}`,
                    background: isActive ? 'var(--ink)' : 'transparent',
                    color: isActive ? 'var(--paper)' : isPending ? 'var(--ink-3)' : 'var(--ink)',
                    opacity: isPending ? 0.65 : 1,
                  }}
                >
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em]">{m.round.name}</div>
                  <div
                    className="mt-1 font-serif italic text-[11px]"
                    style={{ color: isActive ? 'rgba(250, 246, 236, 0.6)' : 'var(--ink-3)' }}
                  >
                    {m.round.points_per_correct_tip}pt each
                  </div>
                  {m.state === 'done' && (
                    <div
                      className="mt-1.5 font-serif text-[18px] leading-none tabular-nums md:text-[24px]"
                      style={{ color: isActive ? 'var(--paper)' : 'var(--ink)' }}
                    >
                      +{m.earned}
                    </div>
                  )}
                  {m.state === 'live' && (
                    <div
                      className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.18em]"
                      style={{ color: isActive ? '#F2EBDC' : 'var(--brick)' }}
                    >
                      Live
                    </div>
                  )}
                  {m.state === 'pending' && (
                    <div className="mt-1.5 font-serif italic text-[12px] text-[var(--ink-3)]">to come</div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Round summary header */}
      {active && (
        <section className="relative z-10 px-4 pt-5 md:px-8 md:pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b-2 border-[var(--ink)] pb-2">
            <div className="flex items-baseline gap-3.5">
              <h2 className="m-0 font-serif text-[22px] tracking-tight md:text-[28px]">
                The card · {ROUND_LONG[active.round.name] ?? active.round.name}
              </h2>
              <span className="tp-eyebrow">{active.round.points_per_correct_tip} points per correct call</span>
            </div>
            <div className="flex items-baseline gap-5 md:gap-6">
              <RoundStat label="Filed" value={`${active.picked}/${active.matches.length}`} />
              <RoundStat label="Resulted" value={`${active.resulted}/${active.matches.length}`} />
              <RoundStat label="Earned" value={`+${active.earned}`} colour="var(--brick)" />
            </div>
          </div>
        </section>
      )}

      {/* Match cards */}
      <section className="relative z-10 flex-1 px-4 pb-8 pt-3 md:px-8">
        {!active || active.matches.length === 0 ? (
          <div className="py-8 text-center font-serif italic text-[var(--ink-2)]">
            No fixtures yet for this round.
          </div>
        ) : (
          <div className="space-y-1.5">
            {active.matches.map(m => {
              const tip = tipMap[m.id] as 'player1' | 'player2' | undefined
              const state = classifyMatch(m, tip, now)
              return (
                <MatchCard
                  key={m.id}
                  match={m}
                  state={state}
                  tip={tip}
                  pointsPerCorrect={active.round.points_per_correct_tip}
                  roundName={active.round.name}
                  onPick={(side) => placePick(m.id, active.round.name, side)}
                  pendingSide={pendingPicks[m.id] ?? null}
                  now={now}
                />
              )
            })}
          </div>
        )}
      </section>

      <TabBar tournamentSlug={tournament.slug} />
    </main>
  )
}

function RoundStat({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div>
      <div className="tp-eyebrow mb-1">{label}</div>
      <div className="font-serif text-[20px] leading-none tabular-nums md:text-[22px]" style={{ color: colour }}>
        {value}
      </div>
    </div>
  )
}

interface MatchCardProps {
  match: PicksMatch
  state: MatchState
  tip: 'player1' | 'player2' | undefined
  pointsPerCorrect: number
  roundName: string
  pendingSide: 'player1' | 'player2' | null
  onPick: (side: 'player1' | 'player2') => void
  now: Date
}

function MatchCard({ match, state, tip, pointsPerCorrect, onPick, pendingSide, now }: MatchCardProps) {
  const myP1 = tip === 'player1'
  const myP2 = tip === 'player2'
  const wonP1 = match.winner === 'player1'
  const wonP2 = match.winner === 'player2'
  const resulted = !!match.winner
  const locked = new Date(match.scheduled_start) <= now
  const interactive = !locked && !resulted

  let borderColor = 'var(--rule)'
  let bgColor: string | undefined
  if (state === 'correct') { borderColor = 'rgba(61,79,43,0.4)'; bgColor = 'rgba(61,79,43,0.04)' }
  else if (state === 'wrong') { borderColor = 'rgba(184,84,51,0.4)'; bgColor = 'rgba(184,84,51,0.04)' }

  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 md:grid-cols-[90px_36px_1fr_140px] md:gap-5 md:px-5 md:py-4"
      style={{ border: `1px solid ${borderColor}`, background: bgColor ?? 'transparent' }}
    >
      {/* Mobile header row: time + state pill */}
      <div className="flex items-baseline justify-between md:hidden col-span-2">
        <span className="font-serif italic text-[12px] tabular-nums text-[var(--ink-2)]">
          {fmtTimeOrDay(new Date(match.scheduled_start), now)}
        </span>
        <StatePill state={state} pts={pointsPerCorrect} />
      </div>

      {/* Desktop: time + court */}
      <div className="hidden md:block">
        <div className="font-serif italic text-[15px] leading-none tabular-nums text-[var(--ink)]">
          {fmtTimeOrDay(new Date(match.scheduled_start), now)}
        </div>
      </div>

      {/* Desktop: status dot */}
      <div className="hidden md:flex md:justify-center">
        <StatusDot state={state} />
      </div>

      {/* Players */}
      <div className="md:col-auto col-span-2">
        <PlayerLine
          name={match.player1_name}
          picked={myP1}
          won={wonP1}
          lost={resulted && !wonP1}
          state={state}
          pending={pendingSide === 'player1'}
          onPick={interactive ? () => onPick('player1') : undefined}
        />
        <div className="my-1 text-[8px] font-medium uppercase tracking-[0.18em] text-[var(--ink-3)] md:text-[9px]">v</div>
        <PlayerLine
          name={match.player2_name}
          picked={myP2}
          won={wonP2}
          lost={resulted && !wonP2}
          state={state}
          pending={pendingSide === 'player2'}
          onPick={interactive ? () => onPick('player2') : undefined}
        />
      </div>

      {/* Desktop right-side pill */}
      <div className="hidden md:block md:text-right">
        <StatePill state={state} pts={pointsPerCorrect} />
      </div>
    </div>
  )
}

function StatusDot({ state }: { state: MatchState }) {
  const styles: Record<MatchState, { bg: string; border?: string; symbol?: React.ReactNode; color: string }> = {
    correct: { bg: 'var(--olive)', symbol: '✓', color: 'var(--paper)' },
    wrong:   { bg: 'var(--brick)', symbol: '✗', color: 'var(--paper)' },
    locked:  { bg: 'rgba(27,24,20,0.12)', color: 'var(--ink-2)' },
    'no-pick': { bg: 'rgba(27,24,20,0.06)', color: 'var(--ink-3)' },
    picked:  { bg: 'rgba(27,24,20,0.08)', color: 'var(--ink-2)' },
    open:    { bg: 'transparent', border: '1px dashed var(--brick)', symbol: '+', color: 'var(--brick)' },
  }
  const s = styles[state]
  return (
    <div
      className="flex size-[30px] items-center justify-center rounded-full text-[14px]"
      style={{ background: s.bg, border: s.border, color: s.color, fontWeight: 500 }}
      aria-hidden
    >
      {s.symbol}
    </div>
  )
}

function StatePill({ state, pts }: { state: MatchState; pts: number }) {
  const styles: Record<MatchState, { label: string; color: string; fill?: string }> = {
    correct: { label: `+${pts}`, color: 'var(--olive)', fill: 'rgba(61,79,43,0.1)' },
    wrong:   { label: '0', color: 'var(--brick)', fill: 'rgba(184,84,51,0.1)' },
    locked:  { label: 'pending', color: 'var(--ink-3)' },
    'no-pick': { label: 'no pick', color: 'var(--ink-3)' },
    picked:  { label: 'picked', color: 'var(--ink-2)' },
    open:    { label: 'tap to pick', color: 'var(--brick)' },
  }
  const s = styles[state]
  return (
    <span
      className="inline-block whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.18em] tabular-nums"
      style={{
        color: s.color,
        background: s.fill,
        padding: s.fill ? '4px 8px' : 0,
      }}
    >
      {s.label}
    </span>
  )
}

interface PlayerLineProps {
  name: string
  picked: boolean
  won: boolean
  lost: boolean
  state: MatchState
  pending: boolean
  onPick?: () => void
}

function PlayerLine({ name, picked, won, lost, state, pending, onPick }: PlayerLineProps) {
  const display = stripSeed(name)
  const seed = parseSeed(name)
  const color = won ? 'var(--olive)' : lost ? 'var(--ink-3)' : picked ? 'var(--ink)' : 'var(--ink-2)'
  const showHint = picked && (state === 'open' || state === 'picked')
  const inner = (
    <div
      className="flex items-baseline gap-2"
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        lineHeight: 1.15,
        fontWeight: picked ? 500 : 400,
        color,
        textDecoration: picked && !won && !lost ? 'underline var(--brick) 1.5px' : 'none',
        textUnderlineOffset: 4,
        opacity: lost ? 0.55 : 1,
      }}
    >
      <span className="truncate">{display}</span>
      {seed && <span className="font-serif italic text-[11px] text-[var(--ink-3)]">[{seed}]</span>}
      {won && (
        <span className="ml-1 text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--olive)]">won</span>
      )}
      {showHint && !pending && (
        <span className="ml-1 font-serif italic text-[11px] text-[var(--brick)]">← your pick</span>
      )}
      {pending && (
        <svg className="ml-1 size-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
          <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
    </div>
  )

  if (!onPick) return inner

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      aria-label={`Pick ${display}`}
      className="block w-full text-left transition-colors hover:bg-[rgba(184,84,51,0.06)] active:scale-[0.99]"
      style={{ padding: '2px 4px', margin: '-2px -4px' }}
    >
      {inner}
    </button>
  )
}
