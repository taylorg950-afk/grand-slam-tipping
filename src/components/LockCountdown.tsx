'use client'

import { useEffect, useState } from 'react'

function parts(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000))
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

/**
 * Live countdown to the next lock. Renders nothing until mounted so the server
 * and first client paint agree — a ticking clock in server HTML is guaranteed
 * to be stale and would trip hydration.
 */
export default function LockCountdown({
  target,
  label = 'Tips close in',
  tone = 'light',
}: {
  /** ISO timestamp of the lock. */
  target: string
  label?: string
  /** 'light' sits on the navy hero; 'dark' on a white card. */
  tone?: 'light' | 'dark'
}) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    // First tick is scheduled rather than run inline: setting state
    // synchronously in an effect body triggers a cascading render.
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [])

  if (now === null) return null

  const left = new Date(target).getTime() - now
  const closed = left <= 0
  const { d, h, m, s } = parts(left)

  // Under an hour it becomes a real deadline, so show seconds and warm it up.
  const urgent = !closed && left < 60 * 60 * 1000
  const text = closed
    ? 'Tips are closed'
    : d > 0
      ? `${d}d ${h}h ${m}m`
      : h > 0
        ? `${h}h ${m}m ${String(s).padStart(2, '0')}s`
        : `${m}m ${String(s).padStart(2, '0')}s`

  const palette = tone === 'light'
    ? { label: '#B9CBF2', value: '#fff', urgentBg: 'var(--spark)', urgentInk: 'var(--spark-ink)' }
    : { label: 'var(--ink-3)', value: 'var(--ink)', urgentBg: 'var(--spark)', urgentInk: 'var(--spark-ink)' }

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold tabular-nums"
      style={
        urgent
          ? { background: palette.urgentBg, color: palette.urgentInk }
          : { background: tone === 'light' ? 'rgba(255,255,255,0.14)' : 'var(--paper-3)', color: palette.value }
      }
      aria-live={urgent ? 'polite' : 'off'}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: urgent ? palette.urgentInk : palette.label }}
      >
        {closed ? '' : label}
      </span>
      {text}
    </span>
  )
}
