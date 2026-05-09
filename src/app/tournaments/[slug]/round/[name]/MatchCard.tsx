'use client'

import { useTransition } from 'react'
import { submitTip } from './actions'

type Tip = { predicted_winner: 'player1' | 'player2' } | null

interface Match {
  id: string
  player1_name: string
  player2_name: string
  scheduled_start: string
  winner: 'player1' | 'player2' | null
}

export default function MatchCard({
  match,
  tip,
  slug,
  roundName,
}: {
  match: Match
  tip: Tip
  slug: string
  roundName: string
}) {
  const [pending, startTransition] = useTransition()
  const locked = new Date(match.scheduled_start) <= new Date()
  const resulted = match.winner !== null

  function pick(predicted: 'player1' | 'player2') {
    if (locked || pending) return
    startTransition(async () => {
      await submitTip(slug, roundName, match.id, predicted)
    })
  }

  function playerClass(slot: 'player1' | 'player2') {
    const picked = tip?.predicted_winner === slot
    const isWinner = match.winner === slot
    const isLoser = resulted && match.winner !== slot

    let base = 'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors text-center'

    if (resulted) {
      if (isWinner && picked) return `${base} border-green-500 bg-green-50 text-green-800`
      if (isWinner) return `${base} border-green-300 bg-green-50 text-green-700`
      if (isLoser && picked) return `${base} border-red-300 bg-red-50 text-red-700 line-through`
      return `${base} border-zinc-200 bg-zinc-50 text-zinc-400`
    }

    if (locked) {
      if (picked) return `${base} border-zinc-900 bg-zinc-900 text-white`
      return `${base} border-zinc-200 bg-zinc-50 text-zinc-400`
    }

    if (picked) return `${base} border-zinc-900 bg-zinc-900 text-white cursor-pointer`
    return `${base} border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 cursor-pointer`
  }

  return (
    <div className={`space-y-2 rounded-xl border p-4 ${pending ? 'opacity-60' : ''} ${resulted ? 'border-zinc-100 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
      <div className="flex items-center gap-2">
        <button onClick={() => pick('player1')} className={playerClass('player1')} disabled={locked || pending}>
          {match.player1_name}
        </button>
        <span className="text-xs font-medium text-zinc-400">vs</span>
        <button onClick={() => pick('player2')} className={playerClass('player2')} disabled={locked || pending}>
          {match.player2_name}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{formatMatchTime(match.scheduled_start)}</span>
        <span>
          {resulted
            ? `Result: ${match.winner === 'player1' ? match.player1_name : match.player2_name}`
            : locked
            ? 'Locked'
            : tip
            ? 'Picked'
            : 'No pick yet'}
        </span>
      </div>
    </div>
  )
}

function formatMatchTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}
