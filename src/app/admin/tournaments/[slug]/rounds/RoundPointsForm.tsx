'use client'

import { useState, useTransition } from 'react'
import { updateRoundPoints } from './actions'

export default function RoundPointsForm({
  roundId,
  slug,
  initialPoints,
}: {
  roundId: string
  slug: string
  initialPoints: number
}) {
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(String(initialPoints))
  const [saved, setSaved] = useState(initialPoints)
  const [error, setError] = useState('')

  function save() {
    const points = Number(value)
    if (points === saved) return
    setError('')
    startTransition(async () => {
      const result = await updateRoundPoints(roundId, points, slug)
      if (result?.error) {
        setError(result.error)
        setValue(String(saved))
      } else {
        setSaved(points)
      }
    })
  }

  return (
    <span className="ml-2 inline-flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        disabled={pending}
        className="w-16 rounded-md border border-zinc-200 px-2 py-1 text-xs tabular-nums text-zinc-700 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
        aria-label="Points per correct tip"
      />
      <span className="text-xs text-zinc-400">pts per correct tip</span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
