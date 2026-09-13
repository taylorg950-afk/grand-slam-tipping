'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Keyed per tournament so a new slam celebrates again. */
  tournamentId: string
  tournamentName: string
  /** Where this viewer finished. */
  position: number
  players: number
  points: number
  winnerName: string
  /** Prize in whole dollars, when they finished in the money. */
  prize: number | null
  /**
   * Admin preview. This only ever fires once a tournament ends, and only twice
   * per person, so there is no way to check it looks right before it matters.
   * Preview renders it on demand and touches none of the stored count.
   */
  preview?: boolean
}

/** Shown on the first two visits after the tournament finishes, then retired. */
const MAX_SHOWS = 2
const COLOURS = ['#D9EC3C', '#1B4DD8', '#1C7A4B', '#C24B2C', '#6C5CE7', '#A9741F']

const ordinal = (n: number) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; colour: string; spin: number; angle: number
  sway: number; phase: number
}

/** How long the confetti falls for, in milliseconds. */
const DURATION = 9000
/** Downward pull per frame. Low, so the pieces hang and flutter rather than
 *  being fired off the bottom of the screen inside a second. */
const GRAVITY = 0.055
/** Fastest a piece may fall, so nothing outruns the eye. */
const TERMINAL = 2.6

export default function WinnerCelebration(props: Props) {
  const { tournamentId, tournamentName, position, players, points, winnerName, prize, preview } = props
  // null until the browser has told us how many times this has been seen.
  const [show, setShow] = useState<boolean | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const counted = useRef(false)

  const storageKey = `tp:celebrated:${tournamentId}`

  useEffect(() => {
    // Strict mode runs effects twice in development; without this the visit
    // would be counted twice and the celebration cut to a single showing.
    if (counted.current) return
    counted.current = true

    // Scheduled rather than run inline: setting state straight from an effect
    // body cascades a second render before the first has painted.
    const id = window.setTimeout(() => {
      if (preview) { setShow(true); return }

      let seen = 0
      try {
        seen = Number(window.localStorage.getItem(storageKey) ?? '0') || 0
      } catch {
        // Private windows and blocked site data throw on access. Showing it is
        // the friendlier failure, so carry on with seen = 0.
      }
      if (seen >= MAX_SHOWS) { setShow(false); return }
      try { window.localStorage.setItem(storageKey, String(seen + 1)) } catch { /* not essential */ }
      setShow(true)
    }, 0)
    return () => clearTimeout(id)
  }, [storageKey, preview])

  useEffect(() => {
    if (!show) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const w = () => canvas.width / dpr
    const h = () => canvas.height / dpr
    const parts: Particle[] = []
    const burst = (originX: number, originY: number, count: number) => {
      for (let i = 0; i < count; i++) {
        parts.push({
          x: originX, y: originY,
          vx: (Math.random() - 0.5) * 7,
          vy: Math.random() * -7 - 1,
          size: 5 + Math.random() * 7,
          colour: COLOURS[(Math.random() * COLOURS.length) | 0],
          spin: (Math.random() - 0.5) * 0.22,
          angle: Math.random() * Math.PI,
          sway: 0.4 + Math.random() * 1.1,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    // Two cannons from the lower corners, then a drift from above, so there is
    // something on screen for the whole time rather than one quick flash.
    burst(w() * 0.12, h() * 0.78, 70)
    burst(w() * 0.88, h() * 0.78, 70)
    const timers = [
      window.setTimeout(() => burst(w() * 0.5, h() * 0.1, 60), 500),
      window.setTimeout(() => burst(w() * 0.3, h() * 0.05, 50), 1600),
      window.setTimeout(() => burst(w() * 0.7, h() * 0.05, 50), 2600),
    ]

    let raf = 0
    const started = performance.now()
    const tick = () => {
      const elapsed = performance.now() - started
      ctx.clearRect(0, 0, w(), h())
      // Fade only over the last second and a half, so the pieces are solid for
      // almost the whole fall instead of dimming from the moment they appear.
      const fade = Math.min(1, Math.max(0, (DURATION - elapsed) / 1500))
      for (const p of parts) {
        p.vy = Math.min(p.vy + GRAVITY, TERMINAL)
        p.vx *= 0.992
        p.phase += 0.06
        p.x += p.vx + Math.sin(p.phase) * p.sway
        p.y += p.vy
        p.angle += p.spin
        if (p.y - p.size > h()) continue          // off the bottom, stop drawing
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.globalAlpha = fade
        ctx.fillStyle = p.colour
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (elapsed < DURATION) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w(), h())
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', resize)
    }
  }, [show])

  // Nothing is rendered on the server: how many times this has been seen is
  // only knowable in the browser, and guessing would flash the wrong thing.
  if (!show) return null

  const won = position === 1
  const heading = won ? 'You won it.' : `You finished ${ordinal(position)}.`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${tournamentName} result`}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(11,20,55,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={() => setShow(false)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ width: '100%', height: '100%' }}
      />
      <div
        className="tp-card relative w-full max-w-[440px] p-7 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)]">
          {tournamentName} · final standings
        </div>
        <h2 className="mt-2 font-serif text-[38px] font-bold leading-[1.05]">{heading}</h2>

        <div className="mt-1 text-[15px] text-[var(--ink-2)]">
          {points} points, {ordinal(position)} of {players}.
        </div>

        {!won && (
          <div className="mt-3 text-[14px] text-[var(--ink-2)]">
            <span className="font-semibold text-[var(--ink)]">{winnerName}</span> takes the title.
          </div>
        )}

        {prize != null && prize > 0 && (
          <div
            className="mt-5 rounded-[12px] px-4 py-3 text-[15px] font-semibold"
            style={{ background: 'var(--spark)', color: 'var(--spark-ink)' }}
          >
            You’re in the money — ${prize.toLocaleString('en-AU')}.
          </div>
        )}

        <button
          type="button"
          onClick={() => setShow(false)}
          className="tp-cta mt-6 w-full"
        >
          See the full table
        </button>
      </div>
    </div>
  )
}
