'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitTip } from '../round/[name]/actions'

interface Match {
  id: string
  round_id: string
  player1_name: string
  player2_name: string
  scheduled_start: string
  winner: string | null
  draw: string
}

interface Round {
  id: string
  name: string
  points_per_correct_tip: number
  sort_order: number
}

interface GroupedRound {
  round: Round
  matches: Match[]
}

interface Props {
  grouped: GroupedRound[]
  tipMap: Record<string, string>
  slug: string
}

export default function PicksView({ grouped, tipMap: initialTipMap, slug }: Props) {
  const router = useRouter()
  const [activeRoundId, setActiveRoundId] = useState(grouped[0]?.round.id ?? null)
  const [tipMap, setTipMap] = useState(initialTipMap)
  const [pending, startTransition] = useTransition()
  const [pendingPick, setPendingPick] = useState<{ matchId: string; pick: 'player1' | 'player2' } | null>(null)

  const active = grouped.find(g => g.round.id === activeRoundId) ?? grouped[0]
  const now = new Date()

  if (!active) {
    return (
      <p className="font-serif italic text-[#3C342C] text-lg text-center py-12">
        No matches yet.
      </p>
    )
  }

  const { round, matches: roundMatches } = active
  const roundCorrect = roundMatches.filter(m => m.winner && tipMap[m.id] === m.winner).length
  const roundPoints = roundCorrect * round.points_per_correct_tip
  const roundPicked = roundMatches.filter(m => tipMap[m.id]).length

  function placePick(matchId: string, roundName: string, pick: 'player1' | 'player2') {
    if (pending) return
    if (tipMap[matchId] === pick) return
    const prev = tipMap
    setPendingPick({ matchId, pick })
    setTipMap({ ...tipMap, [matchId]: pick })
    startTransition(async () => {
      const result = await submitTip(slug, roundName, matchId, pick)
      if (result?.error) {
        setTipMap(prev)
        console.error(result.error)
      } else {
        router.refresh()
      }
      setPendingPick(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Round toggle */}
      <div className="flex gap-2 overflow-x-auto pb-px -mx-5 px-5">
        {grouped.map(({ round: r, matches: rm }) => {
          const correct = rm.filter(m => m.winner && tipMap[m.id] === m.winner).length
          const pts = correct * r.points_per_correct_tip
          const isActive = r.id === activeRoundId
          return (
            <button
              key={r.id}
              onClick={() => setActiveRoundId(r.id)}
              className={`shrink-0 flex flex-col items-center px-3.5 py-2 rounded-[2px] border transition-colors
                          ${isActive
                            ? 'bg-[#1B1814] border-[#1B1814] text-[#FAF6EC]'
                            : 'bg-white border-[#1B181420] text-[#3C342C] hover:border-[#1B181460]'}`}
            >
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold">{r.name}</span>
              {pts > 0 && (
                <span className={`text-[9px] mt-0.5 ${isActive ? 'text-[#FAF6EC80]' : 'text-[#B85433]'}`}>
                  +{pts}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Round summary */}
      <div className="flex items-baseline justify-between pb-2 border-b-2 border-[#1B1814]">
        <div className="flex items-baseline gap-2">
          <span className="font-serif italic text-xl">{roundLongName(round.name)}</span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-[#3C342C]">
            {round.points_per_correct_tip} pt{round.points_per_correct_tip !== 1 ? 's' : ''} per correct
          </span>
        </div>
        <span className="font-serif text-lg tabular-nums text-[#B85433]">
          {roundPoints > 0 ? `+${roundPoints}` : roundPicked > 0 ? '0' : '—'}
        </span>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {roundMatches.map(m => {
          const tip = tipMap[m.id]
          const locked = new Date(m.scheduled_start) <= now
          const resulted = !!m.winner
          const correct = resulted && tip === m.winner
          const wrong = resulted && !!tip && tip !== m.winner
          const rowPending = pendingPick?.matchId === m.id

          const p1Name = stripSeed(m.player1_name)
          const p2Name = stripSeed(m.player2_name)
          const p1Seed = parseSeed(m.player1_name)
          const p2Seed = parseSeed(m.player2_name)

          return (
            <div
              key={m.id}
              className={`rounded-[2px] border px-3 py-2.5 flex items-center gap-3
                          ${correct ? 'border-[#3D4F2B] bg-[#3D4F2B08]'
                            : wrong ? 'border-[#B8543330] bg-[#B8543308]'
                            : tip && !locked ? 'border-[#B8543340] bg-white'
                            : 'border-[#1B181418] bg-white'}`}
            >
              {/* Status dot */}
              <div
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: correct ? '#3D4F2B' : wrong ? '#B85433' : tip ? '#3C342C20' : '#1B181412',
                  color: correct || wrong ? 'white' : '#3C342C',
                }}
              >
                {correct ? '✓' : wrong ? '✗' : tip ? '·' : ''}
              </div>

              {/* Players */}
              <div className="flex-1 min-w-0">
                <PlayerLine
                  name={p1Name} seed={p1Seed}
                  picked={tip === 'player1'} won={m.winner === 'player1'}
                  resulted={resulted} locked={locked}
                  pending={rowPending && pendingPick?.pick === 'player1'}
                  onPick={() => placePick(m.id, round.name, 'player1')}
                />
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#1B181430] my-0.5 ml-0.5">vs</div>
                <PlayerLine
                  name={p2Name} seed={p2Seed}
                  picked={tip === 'player2'} won={m.winner === 'player2'}
                  resulted={resulted} locked={locked}
                  pending={rowPending && pendingPick?.pick === 'player2'}
                  onPick={() => placePick(m.id, round.name, 'player2')}
                />
              </div>

              {/* Right */}
              <div className="shrink-0 text-right min-w-[44px]">
                {!tip && !locked && (
                  <span className="text-[9px] uppercase tracking-[0.14em] text-[#B85433] font-semibold">
                    Tap to pick
                  </span>
                )}
                {!tip && locked && (
                  <span className="text-[9px] uppercase tracking-[0.12em] text-[#1B181430]">No pick</span>
                )}
                {tip && correct && (
                  <span className="text-[10px] font-semibold text-[#3D4F2B]">+{round.points_per_correct_tip}</span>
                )}
                {tip && wrong && (
                  <span className="text-[10px] text-[#B85433]">0</span>
                )}
                {tip && !resulted && locked && (
                  <span className="text-[9px] uppercase tracking-[0.12em] text-[#3C342C] opacity-50">Pending</span>
                )}
                {tip && !resulted && !locked && (
                  <span className="text-[9px] uppercase tracking-[0.12em] text-[#3C342C] opacity-50">Picked</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlayerLine({ name, seed, picked, won, resulted, locked, pending, onPick }: {
  name: string
  seed: string | null
  picked: boolean
  won: boolean
  resulted: boolean
  locked: boolean
  pending: boolean
  onPick: () => void
}) {
  const dim = resulted && !won
  const interactive = !locked && !resulted
  const inner = (
    <div className={`flex items-center gap-1.5 text-[13px] leading-snug w-full
                     ${dim ? 'opacity-35' : ''} ${picked ? 'font-semibold' : 'font-normal'}`}>
      <span className={picked ? (won ? 'text-[#3D4F2B]' : resulted ? 'text-[#B85433]' : 'text-[#1B1814]') : 'text-[#3C342C]'}>
        {name}
      </span>
      {seed && <span className="text-[9px] text-[#1B181450] font-normal">[{seed}]</span>}
      {picked && !resulted && !pending && (
        <span className="text-[9px] uppercase tracking-[0.1em] text-[#B85433] font-normal ml-0.5">← pick</span>
      )}
      {pending && (
        <svg className="animate-spin size-3 ml-0.5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#B85433" strokeWidth="3" />
          <path className="opacity-75" fill="#B85433" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
    </div>
  )

  if (!interactive) {
    return inner
  }

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      aria-label={`Pick ${name}`}
      className="w-full text-left rounded-[2px] -mx-1 px-1 py-0.5
                 hover:bg-[#B854330f] active:scale-[0.99] transition-all duration-75
                 cursor-pointer"
    >
      {inner}
    </button>
  )
}

function stripSeed(name: string) {
  return name.replace(/\s*\[.*?\]/, '').trim()
}

function parseSeed(name: string) {
  return name.match(/\[(\d+)\]/)?.[1] ?? null
}

function roundLongName(name: string) {
  const map: Record<string, string> = {
    R128: 'Round of 128', R64: 'Round of 64', R32: 'Round of 32',
    R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'Final',
  }
  return map[name] ?? name
}
