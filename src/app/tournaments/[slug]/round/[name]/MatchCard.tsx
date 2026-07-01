'use client'

import { useTransition, useState } from 'react'
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
  pointsIfCorrect,
}: {
  match: Match
  tip: Tip
  slug: string
  roundName: string
  pointsIfCorrect: number
}) {
  const [pending, startTransition] = useTransition()
  const [pendingPick, setPendingPick] = useState<'player1' | 'player2' | null>(null)
  const locked = match.winner !== null || new Date(match.scheduled_start) <= new Date()

  function pick(p: 'player1' | 'player2') {
    if (locked || pending || tip?.predicted_winner === p) return
    setPendingPick(p)
    startTransition(async () => {
      await submitTip(slug, roundName, match.id, p)
      setPendingPick(null)
    })
  }

  return (
    <div className={`border rounded-[2px] mb-1.5 overflow-hidden relative
                    ${locked ? 'bg-[var(--paper-2)] border-[#15231B20]' : 'bg-[var(--paper)] border-[#15231B20]'}`}>
      {(['player1', 'player2'] as const).map((key, i) => {
        const name = i === 0 ? match.player1_name : match.player2_name
        const picked = tip?.predicted_winner === key
        const won = locked && match.winner === key
        const lost = locked && match.winner !== null && match.winner !== key
        const tint = i === 0 ? 'var(--brick-dark)' : 'var(--olive)'
        const isLoading = pendingPick === key

        return (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            disabled={locked || pending}
            aria-pressed={picked}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left relative
                       ${i === 1 ? 'border-t border-[#15231B20]' : ''}
                       ${picked && !locked ? 'bg-[#00643C1f]' : ''}
                       ${lost ? 'opacity-45' : ''}
                       ${!locked ? 'hover:bg-[#00643C0f] cursor-pointer active:scale-[0.98]' : 'cursor-default'}
                       disabled:cursor-default transition-all duration-75`}
          >
            {picked && (
              <span aria-hidden
                    className={`absolute left-0 top-0 bottom-0 w-[3px]
                                ${locked ? (won ? 'bg-[var(--olive)]' : 'bg-[var(--brick-dark)]') : 'bg-[var(--brick)]'}`} />
            )}

            {/* Avatar circle */}
            <div className="size-8 rounded-full text-[var(--paper)] flex items-center justify-center
                            font-serif text-base shrink-0"
                 style={{ background: tint, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}>
              {name[0]}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-serif text-lg leading-[1.1] tracking-tight text-[var(--ink)] truncate">
                {name}
              </div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-2)] mt-0.5">
                {picked && !locked && <span className="text-[var(--brick)] font-semibold">your call</span>}
                {picked && won && <span className="text-[var(--olive)] font-semibold">+{pointsIfCorrect} pts</span>}
                {picked && lost && <span className="text-[var(--brick-dark)] font-semibold">no points</span>}
                {!picked && won && <span className="text-[var(--olive)]">won</span>}
              </div>
            </div>

            {!locked && (
              <span className={`size-[22px] rounded-full border-[1.5px] flex items-center justify-center text-[12px] font-bold shrink-0
                               ${picked && !isLoading ? 'bg-[var(--brick)] border-[var(--brick)] text-[var(--paper)]' : ''}
                               ${isLoading ? 'border-[var(--brick)]' : !picked ? 'border-[#15231B20]' : ''}`}>
                {isLoading ? (
                  <svg className="animate-spin size-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
                    <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : picked ? '✓' : null}
              </span>
            )}
            {locked && won && (
              <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--olive)] font-bold shrink-0">Won</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
