'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TabBar } from '@/components/TabBar'
import LockCountdown from '@/components/LockCountdown'
import { submitTip } from '../round/[name]/actions'
import { AEST_TZ, AEST_LABEL, aestDayKey } from '@/lib/time'

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
  score: string | null
  no_points: boolean
  draw: string
}

interface Tournament {
  name: string
  slug: string
}

export interface RoomCount {
  player1: number
  player2: number
}

interface Props {
  tournament: Tournament
  rounds: PicksRound[]
  matches: PicksMatch[]
  tipMap: Record<string, string>
  /** Keyed by match id. Only locked matches are present — see picks/page.tsx. */
  roomCounts: Record<string, RoomCount>
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

type MatchState = 'correct' | 'wrong' | 'void' | 'locked' | 'no-pick' | 'picked' | 'open' | 'awaiting'

function statusVerb(meta: RoundMeta, now: Date): string {
  const total = meta.matches.length
  if (!meta.hasMatches) return 'to come'
  if (meta.resulted === total && total > 0) return 'complete'
  if (meta.resulted > 0) return 'underway'
  if (meta.matches.some(m => new Date(m.scheduled_start) <= now)) return 'in progress'
  return 'to come'
}

function fmtLockTime(d: Date) {
  return `${d.toLocaleString('en-AU', { timeZone: AEST_TZ, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: false })} ${AEST_LABEL}`
}

function fmtClock(d: Date) {
  return `${d.toLocaleTimeString('en-AU', { timeZone: AEST_TZ, hour: 'numeric', minute: '2-digit', hour12: false })} ${AEST_LABEL}`
}

function fmtTimeOrDay(d: Date, now: Date) {
  const sameDay = aestDayKey(d) === aestDayKey(now)
  if (sameDay) return fmtClock(d)
  return fmtLockTime(d)
}

function stripSeed(name: string) {
  return name.replace(/\s*\[.*?\]/, '').trim()
}
function parseSeed(name: string): string | null {
  return name.match(/\[(\d+)\]/)?.[1] ?? null
}

function isTbd(name: string) {
  return !name || name.trim().toUpperCase() === 'TBD'
}

function classifyMatch(m: PicksMatch, pick: string | undefined, now: Date): MatchState {
  const resulted = !!m.winner
  const locked = new Date(m.scheduled_start) <= now
  if (resulted && m.no_points) return 'void'
  // Both slots empty: the previous round hasn't produced these players yet, so
  // there is nothing to tip. Inviting a tap here just gets it rejected.
  if (!resulted && !locked && isTbd(m.player1_name) && isTbd(m.player2_name)) return 'awaiting'
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

export default function PicksView({ tournament, rounds, matches, tipMap: initialTipMap, roomCounts }: Props) {
  const router = useRouter()
  const now = useMemo(() => new Date(), [])
  const [tipMap, setTipMap] = useState(initialTipMap)
  const [, startTransition] = useTransition()
  // Track in-flight picks per match so saving one doesn't block picking others.
  const [pendingPicks, setPendingPicks] = useState<Record<string, 'player1' | 'player2'>>({})

  // A round worth 0 points is in the draw for the bracket to show, but isn't
  // tipped — the opening round of a 128 draw is 64 picks nobody wants to file.
  // It stays out of the tape and the card entirely.
  const orderedRounds = useMemo(
    () => [...rounds]
      .filter(r => r.points_per_correct_tip > 0)
      .sort((a, b) => a.sort_order - b.sort_order),
    [rounds]
  )

  const meta: RoundMeta[] = useMemo(() => orderedRounds.map(round => {
    const rm = matches.filter(m => m.round_id === round.id)
    const resulted = rm.filter(m => m.winner).length
    const picked = rm.filter(m => tipMap[m.id]).length
    const earned = rm.reduce((sum, m) => {
      const t = tipMap[m.id]
      return sum + (m.winner && !m.no_points && t === m.winner ? round.points_per_correct_tip : 0)
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


  const heroTitle =
    bannerVerb === 'to come'
      ? `${bannerRoundName} — coming up.`
      : bannerVerb === 'complete'
        ? `${bannerRoundName} — that's a wrap.`
        : `${bannerRoundName} — make your call.`
  const ghostWord = bannerMeta?.round.name ?? cityGhost

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
      {bannerMeta && (
        <section className="uso-hero relative overflow-hidden px-5 py-7 text-white md:px-8 md:py-9">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-6 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
            style={{ fontSize: 'clamp(120px, 22vw, 190px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}
          >
            {ghostWord}
          </span>
          <div className="tp-wrap relative">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
              Your picks · {tournament.name}
            </div>
            <h1 className="mt-2 font-serif text-[30px] font-bold leading-[1] md:text-[40px]">{heroTitle}</h1>
            {(statusBits.length > 0 || firstUpcoming) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                {statusBits.length > 0 && (
                  <span className="text-[14px]" style={{ color: '#DDE6FA' }}>{statusBits.join(' · ')}</span>
                )}
                {firstUpcoming && <LockCountdown target={firstUpcoming.scheduled_start} />}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Round tape */}
      {meta.length > 0 && (
        <section className="px-5 pt-5 md:px-8">
          <div className="tp-wrap tp-scroll flex gap-2.5 overflow-x-auto pb-1.5">
            {meta.map(m => {
              const selected = m.round.id === active?.round.id
              const long = ROUND_LONG[m.round.name] ?? m.round.name
              let value = 'to come'
              if (m.state === 'done') value = `+${m.earned}`
              else if (m.state === 'live') value = 'Live'
              return (
                <button
                  key={m.round.id}
                  type="button"
                  onClick={() => setActiveRoundId(m.round.id)}
                  aria-pressed={selected}
                  title={long}
                  className="tp-tap shrink-0 rounded-[12px] px-3.5 py-2.5 text-left"
                  style={{
                    minWidth: 96,
                    border: `1px solid ${selected ? 'var(--brick)' : 'var(--rule)'}`,
                    background: selected ? 'var(--brick)' : 'var(--paper-2)',
                  }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: selected ? '#fff' : m.state === 'pending' ? 'var(--ink-3)' : 'var(--ink)' }}
                  >
                    {m.round.name}
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: selected ? '#B9CBF2' : 'var(--ink-3)' }}>
                    {m.round.points_per_correct_tip}pt each
                  </div>
                  {m.state === 'live' ? (
                    // Spark is a fill colour, not a text colour — as text on the
                    // white tile it sits at ~1.2:1. Match the chip the match
                    // cards use.
                    <div className="mt-1.5">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] leading-none"
                        style={{ background: 'var(--spark)', color: 'var(--spark-ink)' }}
                      >
                        {value}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="mt-1.5 font-serif text-[20px] font-bold leading-none tabular-nums"
                      style={{
                        color: selected ? '#fff' : m.state === 'pending' ? 'var(--ink-3)' : 'var(--ink)',
                      }}
                    >
                      {value}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Round summary */}
      {active && (
        <section className="px-5 pt-4 md:px-8">
          <div className="tp-wrap flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-[var(--ink)] pb-2.5">
            <h2 className="m-0 font-serif text-[22px] font-bold uppercase tracking-[0.02em] md:text-[24px]">
              The card · {ROUND_LONG[active.round.name] ?? active.round.name}
            </h2>
            <div className="flex gap-6">
              <RoundStat label="Filed" value={`${active.picked}/${active.matches.length}`} />
              <RoundStat label="Resulted" value={`${active.resulted}/${active.matches.length}`} />
              <RoundStat label="Earned" value={`+${active.earned}`} colour="var(--blue)" />
            </div>
          </div>
        </section>
      )}

      {/* Match cards */}
      <section className="flex-1 px-5 pb-8 pt-4 md:px-8">
        {!active || active.matches.length === 0 ? (
          <div className="py-10 text-center text-[14px] text-[var(--ink-2)]">No fixtures yet for this round.</div>
        ) : (
          <div className="tp-wrap flex flex-col gap-3">
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
                  onPick={(side) => placePick(m.id, active.round.name, side)}
                  pendingSide={pendingPicks[m.id] ?? null}
                  now={now}
                  room={roomCounts[m.id]}
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
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">{label}</div>
      <div className="mt-0.5 font-serif text-[20px] font-bold leading-none tabular-nums" style={{ color: colour ?? 'var(--ink)' }}>
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
  pendingSide: 'player1' | 'player2' | null
  onPick: (side: 'player1' | 'player2') => void
  now: Date
  room?: RoomCount
}

function MatchCard({ match, state, tip, pointsPerCorrect, onPick, pendingSide, now, room }: MatchCardProps) {
  const resulted = !!match.winner
  const locked = new Date(match.scheduled_start) <= now
  const interactive = !locked && !resulted && state !== 'awaiting'

  const cardBorder = locked && !resulted ? '#D6DEF0' : 'var(--rule)'

  const myName = tip ? stripSeed(tip === 'player1' ? match.player1_name : match.player2_name) : null
  let line = ''
  let lineColor = 'var(--ink-3)'
  if (state === 'correct') { line = `You called it. +${pointsPerCorrect} points.`; lineColor = 'var(--olive)' }
  else if (state === 'wrong') { line = myName ? `You had ${myName}.` : 'No pick filed.'; lineColor = myName ? 'var(--ink-3)' : 'var(--down)' }
  else if (state === 'void') { line = 'Walkover — no points awarded.' }
  else if (state === 'locked') { line = `Locked in ${myName}.` }
  else if (state === 'no-pick') { line = 'Locked with no pick in.'; lineColor = 'var(--down)' }
  else if (state === 'awaiting') { line = 'Waiting on the previous round.' }
  else if (state === 'open') { line = 'Tap a name to pick — no tip in yet.' }
  else if (state === 'picked') { line = 'Filed. Tap the other name to change.' }

  return (
    <div style={{ background: 'var(--paper-2)', border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '16px 18px' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-serif text-[13px] font-semibold tabular-nums text-[var(--ink-3)]">
          {fmtTimeOrDay(new Date(match.scheduled_start), now)}
        </span>
        <StatePill state={state} pts={pointsPerCorrect} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PlayerButton side="player1" match={match} tip={tip} pendingSide={pendingSide} interactive={interactive} resulted={resulted} onPick={onPick} />
        <PlayerButton side="player2" match={match} tip={tip} pendingSide={pendingSide} interactive={interactive} resulted={resulted} onPick={onPick} />
      </div>
      {line && <div className="mt-3 text-[12px]" style={{ color: lineColor }}>{line}</div>}
      {room && <RoomSplit match={match} room={room} tip={tip} />}
    </div>
  )
}

/** The room's split on a locked match — counts only, never who picked what. */
function RoomSplit({ match, room, tip }: { match: PicksMatch; room: RoomCount; tip?: 'player1' | 'player2' }) {
  const total = room.player1 + room.player2
  if (total === 0) {
    return <div className="mt-2 text-[12px] text-[var(--ink-3)]">Nobody in the room tipped this one.</div>
  }

  const p1 = stripSeed(match.player1_name)
  const p2 = stripSeed(match.player2_name)
  const pct1 = Math.round((room.player1 / total) * 100)
  const lead = room.player1 === room.player2 ? null : room.player1 > room.player2 ? 'player1' : 'player2'
  const withRoom = tip && lead && tip === lead
  const againstRoom = tip && lead && tip !== lead

  return (
    <div className="mt-2.5 border-t border-[var(--rule)] pt-2.5">
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="min-w-0 truncate" style={{ color: tip === 'player1' ? 'var(--brick)' : 'var(--ink-2)', fontWeight: tip === 'player1' ? 600 : 400 }}>
          {p1} <span className="tabular-nums font-semibold">{room.player1}</span>
        </span>
        <span className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-[var(--ink-3)]">
          {total === 1 ? '1 tip' : `${total} tips`}
        </span>
        <span className="min-w-0 truncate text-right" style={{ color: tip === 'player2' ? 'var(--brick)' : 'var(--ink-2)', fontWeight: tip === 'player2' ? 600 : 400 }}>
          <span className="tabular-nums font-semibold">{room.player2}</span> {p2}
        </span>
      </div>
      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--rule)' }} aria-hidden>
        <div style={{ width: `${pct1}%`, background: tip === 'player1' ? 'var(--brick)' : 'var(--ink-3)' }} />
        <div style={{ width: `${100 - pct1}%`, background: tip === 'player2' ? 'var(--brick)' : 'var(--ink-3)' }} />
      </div>
      {againstRoom && (
        <div className="mt-1.5 text-[12px] font-semibold" style={{ color: 'var(--blue)' }}>
          Against the room.
        </div>
      )}
      {withRoom && total > 2 && (
        <div className="mt-1.5 text-[12px] text-[var(--ink-3)]">With the room.</div>
      )}
    </div>
  )
}

function StatePill({ state, pts }: { state: MatchState; pts: number }) {
  const styles: Record<MatchState, { label: string; color: string; bg: string }> = {
    correct: { label: `+${pts}`, color: 'var(--olive)', bg: '#E7F3EC' },
    wrong:   { label: '0', color: 'var(--down)', bg: '#FBE9E4' },
    void:    { label: 'no points', color: 'var(--ink-3)', bg: 'var(--paper-3)' },
    locked:  { label: 'Live', color: 'var(--spark-ink)', bg: 'var(--spark)' },
    'no-pick': { label: 'no pick', color: 'var(--down)', bg: 'var(--paper-3)' },
    picked:  { label: 'Filed', color: 'var(--olive)', bg: '#E7F3EC' },
    open:    { label: 'Tap to pick', color: 'var(--blue)', bg: 'var(--brick-surface)' },
    awaiting: { label: 'Not set', color: 'var(--ink-3)', bg: 'var(--paper-3)' },
  }
  const s = styles[state]
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] tabular-nums"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  )
}

interface PlayerButtonProps {
  side: 'player1' | 'player2'
  match: PicksMatch
  tip: 'player1' | 'player2' | undefined
  pendingSide: 'player1' | 'player2' | null
  interactive: boolean
  resulted: boolean
  onPick: (side: 'player1' | 'player2') => void
}

function PlayerButton({ side, match, tip, pendingSide, interactive, resulted, onPick }: PlayerButtonProps) {
  const rawName = side === 'player1' ? match.player1_name : match.player2_name
  const display = stripSeed(rawName)
  const seed = parseSeed(rawName)
  const isMine = tip === side
  const isWinner = match.winner === side
  const isLoser = resulted && !isWinner
  const pending = pendingSide === side

  let border = '#D6DEF0'
  let bg = 'var(--paper-3)'
  let nameColor = 'var(--ink)'
  let nameWeight = 500
  let tick = ''
  let tickShort = ''   // narrow-card form; '' means never collapse
  let tickColor = 'var(--brick)'
  let opacity = 1

  if (isWinner) {
    border = 'rgba(28,122,75,0.5)'; bg = '#E7F3EC'; nameColor = 'var(--olive)'; nameWeight = 700
    tick = match.score ? `WON · ${match.score}` : 'WON'; tickColor = 'var(--olive)'
  } else if (isMine && !resulted) {
    border = 'var(--brick)'; bg = '#EEF2FC'; nameColor = 'var(--brick)'; nameWeight = 700
    tick = '✓ your call'; tickShort = '✓'
  } else if (isMine && resulted) {
    // A miss should read as loudly as a hit: fill the cell, same as the winner's
    // green, rather than a faint border you have to look for.
    border = 'rgba(192,73,46,0.5)'; bg = '#FBE9E4'; nameColor = 'var(--down)'; nameWeight = 700
    tick = 'your call'; tickShort = '✓'; tickColor = 'var(--down)'
  } else if (isLoser) {
    nameColor = 'var(--ink-3)'; opacity = 0.6
  }

  const inner = (
    <>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="break-words" style={{ fontSize: 18, fontWeight: nameWeight, color: nameColor }}>{display}</span>
        {seed && <span className="shrink-0 text-[12px] text-[var(--ink-3)]">[{seed}]</span>}
      </span>
      {pending ? (
        <svg className="size-3.5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
          <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : tick ? (
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: tickColor }}>
          {tickShort ? (
            <>
              <span className="pick-tick-full">{tick}</span>
              <span className="pick-tick-short" aria-hidden>{tickShort}</span>
            </>
          ) : tick}
        </span>
      ) : null}
    </>
  )

  const commonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    textAlign: 'left',
    padding: '13px 15px',
    borderRadius: 12,
    border: `1.5px solid ${border}`,
    background: bg,
    opacity,
  }

  if (!interactive) {
    return <div className="pick-side" style={commonStyle}>{inner}</div>
  }
  return (
    <button
      type="button"
      onClick={() => onPick(side)}
      aria-pressed={isMine}
      aria-label={`Pick ${display}`}
      className="pick-side tp-tap min-h-[52px]"
      style={commonStyle}
    >
      {inner}
    </button>
  )
}
