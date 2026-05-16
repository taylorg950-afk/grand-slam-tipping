'use client'

import { useState, useMemo } from 'react'

interface DbRound { id: string; name: string; sort_order: number }
interface DbMatch {
  id: string; round_id: string; player1_name: string; player2_name: string
  scheduled_start: string; winner: string | null; draw: string; created_at: string
  bracket_position: number | null
}
interface MyTip { match_id: string; predicted_winner: 'player1' | 'player2' }
interface AllTip { match_id: string; predicted_winner: 'player1' | 'player2'; user_id: string }
interface User { id: string; display_name: string }

interface Props {
  rounds: DbRound[]
  matches: DbMatch[]
  myTips: MyTip[]
  allTips: AllTip[]
  users: User[]
  currentUserId: string
  tournamentSlug: string
}

interface BracketMatch {
  id: string
  roundIndex: number
  position: number
  roundName: string
  player1: string
  player2: string
  winner: string | null
  isLocked: boolean
  isPicksPath: boolean
}

// Layout constants
const MATCH_W = 172
const MATCH_H = 54
const MATCH_GAP = 10
const ROUND_GAP = 44
const HEADER_H = 28
const PAD = 20
const U = MATCH_H + MATCH_GAP

function surname(name: string): string {
  const nameOnly = name.replace(/\s*\[.*?\]/, '').trim()
  const parts = nameOnly.split(' ')
  return parts.length > 1 ? parts[parts.length - 1] : nameOnly
}

function yCenter(pos: number, ri: number): number {
  const span = Math.pow(2, ri) * U
  return PAD + HEADER_H + pos * span + span / 2 - MATCH_GAP / 2
}

function xLeft(ri: number): number {
  return PAD + ri * (MATCH_W + ROUND_GAP)
}

// ── Bracket canvas ────────────────────────────────────────────────────────────

function BracketCanvas({ matches, roundNames }: { matches: BracketMatch[]; roundNames: string[] }) {
  const numRounds = roundNames.length
  const firstRoundMaxPos = matches
    .filter(m => m.roundIndex === 0)
    .reduce((max, m) => Math.max(max, m.position), -1)
  const firstRoundSlots = firstRoundMaxPos + 1 || 1

  const totalW = PAD * 2 + numRounds * MATCH_W + Math.max(numRounds - 1, 0) * ROUND_GAP
  const totalH = PAD * 2 + HEADER_H + firstRoundSlots * U - MATCH_GAP

  const connectors = useMemo(() => {
    const paths: { d: string; picks: boolean }[] = []
    for (const m of matches) {
      const nextPos = Math.floor(m.position / 2)
      const nextMatch = matches.find(n => n.roundIndex === m.roundIndex + 1 && n.position === nextPos)
      if (!nextMatch) continue
      const x1 = xLeft(m.roundIndex) + MATCH_W
      const y1 = yCenter(m.position, m.roundIndex)
      const x2 = xLeft(nextMatch.roundIndex)
      const midX = x1 + ROUND_GAP / 2
      const y2 = yCenter(nextPos, nextMatch.roundIndex)
      paths.push({ d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`, picks: m.isPicksPath })
    }
    return paths
  }, [matches])

  return (
    <div style={{ position: 'relative', width: totalW, height: totalH, minWidth: totalW }}>
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={totalW} height={totalH}>
        {connectors.map((c, i) => (
          <path key={i} d={c.d} fill="none"
                stroke={c.picks ? '#B85433' : '#3C342C60'}
                strokeWidth={c.picks ? 1.5 : 1} />
        ))}
      </svg>

      {/* Round headers */}
      {roundNames.map((name, ri) => (
        <div key={ri} style={{
          position: 'absolute', left: xLeft(ri), top: PAD,
          width: MATCH_W, height: HEADER_H,
          display: 'flex', alignItems: 'center',
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: '#3C342C', fontWeight: 600,
        }}>
          {name}
        </div>
      ))}

      {/* Match cards */}
      {matches.map(m => {
        const x = xLeft(m.roundIndex)
        const cy = yCenter(m.position, m.roundIndex)
        const y = cy - MATCH_H / 2

        const isInProgress = m.isLocked && !m.winner
        const p1Won = m.winner === 'player1'
        const p2Won = m.winner === 'player2'
        const hasResult = m.winner !== null

        const borderColor = m.isPicksPath ? '#B85433' : isInProgress ? '#B8543370' : '#3C342C40'
        const borderWidth = m.isPicksPath ? 1.5 : 0.75
        const borderStyle = isInProgress ? 'dashed' : 'solid'

        function PlayerRow({ name, won, isOther }: { name: string; won: boolean; isOther: boolean }) {
          const seedMatch = name.match(/\[(\d+)\]/)
          const seed = seedMatch ? seedMatch[1] : null
          const nameOnly = seed ? name.replace(/\s*\[\d+\]/, '').trim() : name
          const colour = !hasResult ? '#1B1814' : won ? '#1B1814' : '#3C342C70'
          return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 6px', overflow: 'hidden', gap: 4 }}>
              <span style={{
                fontSize: 11.5, flex: 1,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                color: colour, fontWeight: won ? 600 : 400,
                borderBottom: won ? '1.5px solid #3D4F2B' : 'none',
                paddingBottom: won ? 1 : 0, lineHeight: 1.3,
              }}>
                {nameOnly || '—'}
              </span>
              {seed && (
                <span style={{
                  fontSize: 9, color: won ? '#3D4F2B' : '#3C342C80',
                  fontWeight: 600, flexShrink: 0, lineHeight: 1,
                }}>
                  [{seed}]
                </span>
              )}
            </div>
          )
        }

        return (
          <div key={m.id} style={{
            position: 'absolute', left: x, top: y,
            width: MATCH_W, height: MATCH_H,
            border: `${borderWidth}px ${borderStyle} ${borderColor}`,
            borderRadius: 2,
            background: m.isLocked && hasResult ? '#F2EBDC' : '#FAF6EC',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <PlayerRow name={m.player1} won={p1Won} isOther={p2Won} />
            <div style={{ height: 0.75, background: '#3C342C35', flexShrink: 0 }} />
            <PlayerRow name={m.player2} won={p2Won} isOther={p1Won} />
          </div>
        )
      })}
    </div>
  )
}

// ── Data helpers ──────────────────────────────────────────────────────────────

function buildBracketMatches(
  rounds: DbRound[],
  dbMatches: DbMatch[],
  draw: 'mens' | 'womens',
  quarter: number | null,
  tipMap: Map<string, 'player1' | 'player2'>,
  showPicksPath: boolean
): { matches: BracketMatch[]; roundNames: string[] } {
  const sortedRounds = [...rounds].sort((a, b) => a.sort_order - b.sort_order)
  const now = new Date()

  const byRound: Record<string, DbMatch[]> = {}
  for (const r of sortedRounds) {
    byRound[r.id] = dbMatches
      .filter(m => m.draw === draw && m.round_id === r.id)
      .sort((a, b) => {
        if (a.bracket_position !== null && b.bracket_position !== null)
          return a.bracket_position - b.bracket_position
        if (a.bracket_position !== null) return -1
        if (b.bracket_position !== null) return 1
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
               a.id.localeCompare(b.id)
      })
  }

  // Use the match's actual bracket_position for layout — that's what encodes the
  // bracket structure (pos p in round R is fed by pos 2p, 2p+1 in round R-1, and
  // feeds floor(p/2) in round R+1). Array index would only work if positions are
  // contiguous, which breaks as soon as one match in a round is missing.
  const all: (BracketMatch & { roundId: string; originalRi: number })[] = []
  for (let ri = 0; ri < sortedRounds.length; ri++) {
    const r = sortedRounds[ri]
    const rms = byRound[r.id] ?? []
    for (let i = 0; i < rms.length; i++) {
      const dm = rms[i]
      const locked = new Date(dm.scheduled_start) <= now
      const tip = tipMap.get(dm.id)
      let isPicksPath = false
      if (showPicksPath && tip) {
        isPicksPath = dm.winner ? tip === dm.winner : true
      }
      all.push({
        id: dm.id, roundIndex: ri, originalRi: ri,
        position: dm.bracket_position ?? i,
        roundName: r.name, roundId: r.id,
        player1: dm.player1_name, player2: dm.player2_name,
        winner: dm.winner, isLocked: locked, isPicksPath,
      })
    }
  }

  if (all.length === 0) return { matches: [], roundNames: [] }

  // Infer the true first-round slot count from the deepest-filled round.
  // R0 may have fewer matches than the bracket allows when seeds get byes
  // (e.g. 48 R0 matches + 16 byes feeding directly into R1 = 64 slots).
  // Each round R doubles the slot count: round R has slots, R0 has slots * 2^R.
  const firstRoundSlots = all.reduce((max, m) => {
    return Math.max(max, (m.position + 1) * Math.pow(2, m.originalRi))
  }, (byRound[sortedRounds[0]?.id] ?? []).length)

  let filtered = all
  if (quarter !== null && firstRoundSlots >= 4) {
    const quarterSize = firstRoundSlots / 4
    if (quarterSize >= 1) {
      filtered = all.filter(m => {
        const perQ = Math.max(1, Math.floor(quarterSize / Math.pow(2, m.originalRi)))
        const start = quarter * perQ
        return m.position >= start && m.position < start + perQ
      })
    }
  }

  // Quarter view: shift positions so the selected quarter starts at 0.
  // Full view: keep absolute positions — gaps stay as gaps, so layout matches reality.
  const positionOffset = (originalRi: number): number => {
    if (quarter === null || firstRoundSlots < 4) return 0
    const quarterSize = firstRoundSlots / 4
    return quarter * Math.max(1, Math.floor(quarterSize / Math.pow(2, originalRi)))
  }

  const riSet = [...new Set(filtered.map(m => m.originalRi))].sort((a, b) => a - b)
  const riMap = new Map(riSet.map((ri, i) => [ri, i]))
  const roundNames = riSet.map(ri => sortedRounds[ri].name)

  const matches: BracketMatch[] = filtered.map(m => ({
    id: m.id,
    roundIndex: riMap.get(m.originalRi)!,
    position: m.position - positionOffset(m.originalRi),
    roundName: m.roundName,
    player1: m.player1,
    player2: m.player2,
    winner: m.winner,
    isLocked: m.isLocked,
    isPicksPath: m.isPicksPath,
  }))

  return { matches, roundNames }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BracketView({
  rounds, matches, myTips, allTips, users, currentUserId,
}: Props) {
  const [draw, setDraw] = useState<'mens' | 'womens'>('mens')
  const [quarter, setQuarter] = useState(0)
  const [showPicksPath, setShowPicksPath] = useState(false)

  const tipMap = useMemo(() => {
    const m = new Map<string, 'player1' | 'player2'>()
    myTips.forEach(t => m.set(t.match_id, t.predicted_winner as 'player1' | 'player2'))
    return m
  }, [myTips])

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.sort_order - b.sort_order),
    [rounds]
  )

  const hasWomens = matches.some(m => m.draw === 'womens')

  const firstRound = sortedRounds[0]
  const firstRoundCount = firstRound
    ? matches.filter(m => m.draw === draw && m.round_id === firstRound.id).length
    : 0

  // Infer true bracket size from deepest filled round so byes in R0 don't shrink it.
  const inferredFirstRoundSlots = useMemo(() => {
    let slots = firstRoundCount
    sortedRounds.forEach((r, ri) => {
      const inRound = matches.filter(m => m.draw === draw && m.round_id === r.id)
      for (const m of inRound) {
        const pos = m.bracket_position
        if (pos === null) continue
        slots = Math.max(slots, (pos + 1) * Math.pow(2, ri))
      }
    })
    return slots
  }, [matches, draw, sortedRounds, firstRoundCount])

  const showQuarters = inferredFirstRoundSlots >= 16

  const quarterLabels = useMemo(() => {
    if (!showQuarters || !firstRound) return []
    const quarterSize = Math.floor(inferredFirstRoundSlots / 4)
    const firstRoundByPos = new Map<number, DbMatch>()
    for (const m of matches) {
      if (m.draw !== draw || m.round_id !== firstRound.id || m.bracket_position === null) continue
      firstRoundByPos.set(m.bracket_position, m)
    }
    return [0, 1, 2, 3].map(q => {
      // First real match in this quarter — skip bye slots until we hit a played match.
      for (let p = q * quarterSize; p < (q + 1) * quarterSize; p++) {
        const m = firstRoundByPos.get(p)
        if (m) return `${surname(m.player1_name)}'s quarter`
      }
      return `Q${q + 1}`
    })
  }, [showQuarters, firstRound, inferredFirstRoundSlots, matches, draw])

  const { matches: bracketMatches, roundNames } = useMemo(
    () => buildBracketMatches(rounds, matches, draw, showQuarters ? quarter : null, tipMap, showPicksPath),
    [rounds, matches, draw, quarter, showQuarters, tipMap, showPicksPath]
  )

  const now = new Date()
  const currentRound = useMemo(() => {
    let found: DbRound | null = null
    for (const r of sortedRounds) {
      const rm = matches.filter(m => m.draw === draw && m.round_id === r.id)
      if (rm.some(m => new Date(m.scheduled_start) <= now)) found = r
    }
    return found
  }, [sortedRounds, matches, draw])

  const currentRoundMatches = useMemo(
    () => currentRound
      ? matches.filter(m => m.draw === draw && m.round_id === currentRound.id && new Date(m.scheduled_start) <= now)
      : [],
    [currentRound, matches, draw]
  )

  return (
    <div>
      {/* Draw tabs */}
      {hasWomens && (
        <div className="flex gap-6 border-b border-[#1B181420] mb-5">
          {(['mens', 'womens'] as const).map(d => (
            <button key={d} onClick={() => { setDraw(d); setQuarter(0) }}
                    className={`text-[11px] uppercase tracking-[0.14em] pb-2.5 border-b-2 transition-colors
                               ${draw === d
                                 ? 'text-[#1B1814] font-bold border-[#B85433]'
                                 : 'text-[#3C342C] border-transparent hover:text-[#1B1814]'}`}>
              {d === 'mens' ? "Men's singles" : "Women's singles"}
            </button>
          ))}
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {showQuarters ? (
          <div className="flex gap-2 flex-wrap">
            {quarterLabels.map((label, q) => (
              <button key={q} onClick={() => setQuarter(q)}
                      className={`text-[11px] uppercase tracking-[0.12em] px-3 py-1.5 rounded-[2px]
                                 border transition-colors
                                 ${quarter === q
                                   ? 'bg-[#1B1814] border-[#1B1814] text-[#FAF6EC] font-semibold'
                                   : 'bg-transparent border-[#1B181430] text-[#3C342C] hover:border-[#1B1814] hover:text-[#1B1814]'}`}>
                {label}
              </button>
            ))}
          </div>
        ) : <div />}

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#3C342C]">My picks path</span>
          <button role="switch" aria-checked={showPicksPath}
                  onClick={() => setShowPicksPath(p => !p)}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none',
                    background: showPicksPath ? '#B85433' : '#1B181425',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}>
            <span style={{
              position: 'absolute', top: 2, left: showPicksPath ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#FAF6EC', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>

      {/* Bracket canvas */}
      {bracketMatches.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif italic text-[#3C342C] text-lg">
            No {draw === 'mens' ? "men's" : "women's"} matches added yet.
          </p>
        </div>
      ) : (
        <div className="border border-[#1B181420] rounded-[2px] bg-[#F2EBDC] overflow-x-auto pb-1">
          <BracketCanvas matches={bracketMatches} roundNames={roundNames} />
        </div>
      )}

      {/* Current round picks list */}
      {currentRound && currentRoundMatches.length > 0 && (
        <div className="mt-6 border border-[#1B181420] rounded-[2px] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1B181420] bg-[#F2EBDC]">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#3C342C]">
              {currentRound.name} picks
            </span>
          </div>

          {currentRoundMatches.map(match => {
            const matchTips = allTips.filter(t => t.match_id === match.id)
            const hasResult = match.winner !== null

            return (
              <div key={match.id} className="px-5 py-3 border-b border-[#1B181420] bg-[#FAF6EC]">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[13px] text-[#1B1814]">
                    <span className="font-semibold">{match.player1_name}</span>
                    <span className="text-[#3C342C] mx-2 italic font-serif">v</span>
                    <span className="font-semibold">{match.player2_name}</span>
                  </span>
                  {hasResult && (
                    <span className="text-[11px] text-[#3D4F2B] font-semibold ml-3 shrink-0">
                      {match.winner === 'player1' ? match.player1_name : match.player2_name} won
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {users.map(u => {
                    const tip = matchTips.find(t => t.user_id === u.id)
                    if (!tip) return null
                    const isMe = u.id === currentUserId
                    const pickedName = tip.predicted_winner === 'player1' ? match.player1_name : match.player2_name
                    const correct = hasResult && tip.predicted_winner === match.winner
                    const wrong = hasResult && tip.predicted_winner !== match.winner
                    return (
                      <span key={u.id}
                            className={`text-[11px] ${correct ? 'text-[#3D4F2B]' : wrong ? 'text-[#8E3A1F]' : 'text-[#3C342C]'}
                                       ${isMe ? 'font-semibold' : ''}`}
                            style={isMe ? { background: '#B854331a', padding: '1px 6px', borderRadius: 2 } : undefined}>
                        {u.display_name}: {pickedName}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
