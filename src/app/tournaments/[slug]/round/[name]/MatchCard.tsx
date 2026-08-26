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
  score: string | null
  no_points: boolean
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
    <div className="relative mb-1.5 overflow-hidden rounded-[14px] border" style={{ background: 'var(--paper-2)', borderColor: '#D6DEF0' }}>
      {(['player1', 'player2'] as const).map((key, i) => {
        const name = i === 0 ? match.player1_name : match.player2_name
        const picked = tip?.predicted_winner === key
        const won = locked && match.winner === key
        const lost = locked && match.winner !== null && match.winner !== key
        const tint = i === 0 ? '#1B4DD8' : '#6C5CE7'
        const isLoading = pendingPick === key

        return (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            disabled={locked || pending}
            aria-pressed={picked}
            className={`relative flex w-full items-center gap-3 px-4 py-3 text-left
                       ${i === 1 ? 'border-t border-[var(--rule)]' : ''}
                       ${lost ? 'opacity-50' : ''}
                       ${!locked ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}
                       disabled:cursor-default transition-all duration-75`}
            style={{ background: won ? '#E7F3EC' : picked && !locked ? '#EEF2FC' : 'transparent' }}
          >
            {picked && (
              <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[3px]"
                    style={{ background: locked ? (won ? 'var(--olive)' : 'var(--ink-3)') : 'var(--brick)' }} />
            )}

            {/* Avatar circle */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                 style={{ background: won ? 'var(--olive)' : tint }}>
              {name[0]}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] leading-[1.15]" style={{ fontWeight: picked || won ? 700 : 500, color: won ? 'var(--olive)' : 'var(--ink)' }}>
                {name}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
                {picked && !locked && <span className="font-semibold text-[var(--brick)]">your call</span>}
                {picked && won && (
                  match.no_points
                    ? <span className="font-semibold text-[var(--ink-3)]">no points · walkover</span>
                    : <span className="font-semibold text-[var(--olive)]">+{pointsIfCorrect} pts</span>
                )}
                {picked && lost && (
                  <span className="font-semibold text-[var(--down)]">
                    {match.no_points ? 'no points · walkover' : 'no points'}
                  </span>
                )}
                {!picked && won && <span className="text-[var(--olive)]">won</span>}
                {won && match.score && (
                  <span className="ml-1.5 tabular-nums normal-case tracking-normal text-[11px] text-[var(--ink-3)]">
                    {match.score}
                  </span>
                )}
              </div>
            </div>

            {!locked && (
              <span className="flex size-[24px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-[12px] font-bold"
                    style={{
                      background: picked && !isLoading ? 'var(--brick)' : 'transparent',
                      borderColor: picked || isLoading ? 'var(--brick)' : '#D6DEF0',
                      color: '#fff',
                    }}>
                {isLoading ? (
                  <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--brick)" strokeWidth="3" />
                    <path className="opacity-75" fill="var(--brick)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : picked ? '✓' : null}
              </span>
            )}
            {locked && won && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--olive)]">Won</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
