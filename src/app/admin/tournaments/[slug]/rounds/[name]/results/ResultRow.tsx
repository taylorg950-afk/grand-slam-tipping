'use client'

import { useTransition, useState } from 'react'
import { setResult, setMatchExtras } from './actions'
import { AEST_TZ, AEST_LABEL } from '@/lib/time'

interface Match {
  id: string
  player1_name: string
  player2_name: string
  scheduled_start: string
  winner: 'player1' | 'player2' | null
  score: string | null
  no_points: boolean
}

export default function ResultRow({
  match,
  slug,
  roundName,
}: {
  match: Match
  slug: string
  roundName: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [score, setScore] = useState(match.score ?? '')
  const [noPoints, setNoPoints] = useState(match.no_points)

  function select(winner: 'player1' | 'player2' | null) {
    setError('')
    startTransition(async () => {
      const result = await setResult(match.id, winner, slug, roundName)
      if (result?.error) setError(result.error)
    })
  }

  function saveScore() {
    if ((score.trim() || null) === (match.score ?? null)) return
    setError('')
    startTransition(async () => {
      const result = await setMatchExtras(match.id, { score }, slug, roundName)
      if (result?.error) setError(result.error)
    })
  }

  function toggleNoPoints() {
    const next = !noPoints
    setNoPoints(next)
    setError('')
    startTransition(async () => {
      const result = await setMatchExtras(match.id, { noPoints: next }, slug, roundName)
      if (result?.error) {
        setNoPoints(!next)
        setError(result.error)
      }
    })
  }

  function btnClass(slot: 'player1' | 'player2') {
    const active = match.winner === slot
    return [
      'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-center',
      active
        ? 'border-green-500 bg-green-50 text-green-800'
        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
      pending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    ].join(' ')
  }

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <button onClick={() => select('player1')} className={btnClass('player1')} disabled={pending}>
          {match.player1_name}
        </button>
        <span className="text-xs font-medium text-zinc-400">vs</span>
        <button onClick={() => select('player2')} className={btnClass('player2')} disabled={pending}>
          {match.player2_name}
        </button>
        {match.winner && (
          <button
            onClick={() => select(null)}
            disabled={pending}
            className="text-xs text-zinc-400 hover:text-red-500"
            title="Clear result"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={score}
          onChange={e => setScore(e.target.value)}
          onBlur={saveScore}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          placeholder="Score e.g. 6-4 3-6 7-6(5)"
          className="flex-1 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
        <label className={`flex shrink-0 items-center gap-1.5 text-xs ${noPoints ? 'text-amber-700' : 'text-zinc-500'} ${pending ? 'opacity-50' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={noPoints}
            onChange={toggleNoPoints}
            disabled={pending}
            className="accent-amber-600"
          />
          No points (walkover)
        </label>
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{new Date(match.scheduled_start).toLocaleString('en-AU', { timeZone: AEST_TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: false })} {AEST_LABEL}</span>
        {error && <span className="text-red-600">{error}</span>}
        {!error && match.winner && (
          <span className="text-green-600 font-medium">
            {match.winner === 'player1' ? match.player1_name : match.player2_name} won
            {noPoints && <span className="ml-1 text-amber-600">· no points awarded</span>}
          </span>
        )}
      </div>
    </div>
  )
}
