'use client'

import { useActionState, useState, useTransition, useEffect } from 'react'
import { saveTiebreaker } from './actions'
import { AEST_TZ, AEST_LABEL, aestDayKey } from '@/lib/time'

interface Averages {
  mensAvg: number
  mensMin: number
  mensMax: number
  womensAvg: number
  womensMin: number
  womensMax: number
}

interface Props {
  tournamentId: string
  slug: string
  existing: { mens: number | null; womens: number | null; updatedAt: string | null }
  averages: Averages | null
  locked: boolean
}

const DEFAULT_MENS = 34
const DEFAULT_WOMENS = 21
const MENS_MIN = 18
const MENS_MAX = 80
const WOMENS_MIN = 12
const WOMENS_MAX = 40

export default function TiebreakerForm({ tournamentId, slug, existing, averages, locked }: Props) {
  const [mens, setMens] = useState<number>(existing.mens ?? averages?.mensAvg ?? DEFAULT_MENS)
  const [womens, setWomens] = useState<number>(existing.womens ?? averages?.womensAvg ?? DEFAULT_WOMENS)
  const [savedAt, setSavedAt] = useState<string | null>(existing.updatedAt)
  const [state, action] = useActionState(saveTiebreaker, null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (state?.ok) {
      setSavedAt(new Date().toISOString())
    }
  }, [state])

  function submit() {
    const fd = new FormData()
    fd.set('tournament_id', tournamentId)
    fd.set('slug', slug)
    fd.set('mens_final_total_games', String(mens))
    fd.set('womens_final_total_games', String(womens))
    startTransition(() => action(fd))
  }

  // Locked before anything was filed: the numbers on screen are defaults, not
  // a prediction, so don't report them back as "your call".
  const missedIt = locked && !savedAt

  const filedLabel = savedAt
    ? `Filed at ${new Date(savedAt).toLocaleTimeString('en-AU', { timeZone: AEST_TZ, hour: 'numeric', minute: '2-digit', hour12: false })} ${AEST_LABEL} ${dayLabel(savedAt)}.`
    : 'Not filed yet.'

  return (
    <>
      {/* Scrubbers */}
      <section className="relative z-10 grid grid-cols-1 gap-4 px-4 pt-6 md:grid-cols-2 md:gap-6 md:px-8 md:pt-7">
        <Scrubber
          label="Men's final · total games"
          sublabel="Primary tiebreaker. A 6–4, 6–3, 6–2 final = 27 games."
          value={mens}
          onChange={setMens}
          min={MENS_MIN}
          max={MENS_MAX}
          locked={locked}
          hint={averages ? `Range typically ${averages.mensMin} to ${averages.mensMax}. Last 10 finals: avg ${averages.mensAvg} games.` : 'Five-set max is roughly 60 games.'}
        />
        <Scrubber
          label="Women's final · total games"
          sublabel="Secondary tiebreaker. A 6–4, 6–3 final = 19 games."
          value={womens}
          onChange={setWomens}
          min={WOMENS_MIN}
          max={WOMENS_MAX}
          locked={locked}
          hint={averages ? `Range typically ${averages.womensMin} to ${averages.womensMax}. Last 10 finals: avg ${averages.womensAvg} games.` : 'Three-set max is roughly 30 games.'}
        />
      </section>

      {/* Your call + Save */}
      <section className="flex flex-col gap-4 border-t border-[var(--rule)] px-5 py-5 md:flex-row md:items-center md:justify-between md:gap-9 md:px-8 md:py-6">
        <div className="md:flex-1 md:pr-6">
          <div className="tp-eyebrow mb-1.5">Your call</div>
          {missedIt ? (
            <div className="font-serif text-[20px] font-semibold leading-[1.25] md:text-[26px]">
              No call filed.{' '}
              <span className="text-[15px] font-normal text-[var(--ink-3)]">
                You&apos;re out of the tiebreaker for this one.
              </span>
            </div>
          ) : (
            <div className="font-serif text-[20px] font-semibold leading-[1.25] md:text-[26px]">
              <span className="tabular-nums text-[var(--blue)]">{mens}</span> games for the men.{' '}
              <span className="tabular-nums text-[var(--blue)]">{womens}</span> for the women.{' '}
              <span className="text-[15px] font-normal text-[var(--ink-3)]">{filedLabel}</span>
            </div>
          )}
          {state?.error && (
            <p className="mt-2 text-[12px] text-[var(--down)]">{state.error}</p>
          )}
        </div>
        <div className="md:text-right">
          <button
            type="button"
            onClick={submit}
            disabled={pending || locked}
            className="tp-cta disabled:cursor-not-allowed disabled:opacity-50"
          >
            {locked ? 'Locked' : pending ? 'Saving…' : 'Save tiebreaker →'}
          </button>
          <div className="mt-2 font-serif text-[12px] text-[var(--ink-3)] md:mt-2">
            {locked
              ? "Men's final has started — predictions are locked."
              : "Edit any time before the men's final starts."}
          </div>
        </div>
      </section>
    </>
  )
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const key = aestDayKey(d)
  if (key === aestDayKey(now)) return 'today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (key === aestDayKey(yesterday)) return 'yesterday'
  return d.toLocaleDateString('en-AU', { timeZone: AEST_TZ, weekday: 'short', day: 'numeric', month: 'short' })
}

interface ScrubberProps {
  label: string
  sublabel: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  hint: string
  locked: boolean
}

function Scrubber({ label, sublabel, value, onChange, min, max, hint, locked }: ScrubberProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="tp-card px-6 py-6 md:px-7 md:py-7">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">
        {label}
      </div>
      <div className="mt-1.5 mb-5 max-w-[380px] text-[14px] leading-[1.4] text-[var(--ink-2)]">
        {sublabel}
      </div>

      <div className="flex items-center justify-between border-b-2 border-[var(--ink)] py-2 md:py-3">
        <ScrubberButton
          aria-label="Decrease"
          onClick={() => onChange(clamp(value - 1))}
          disabled={locked || value <= min}
        >
          −
        </ScrubberButton>

        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!Number.isNaN(v)) onChange(clamp(v))
          }}
          disabled={locked}
          inputMode="numeric"
          className="tp-no-spinner w-[120px] bg-transparent text-center font-serif leading-none tabular-nums text-[72px] md:w-[160px] md:text-[110px]"
          style={{
            color: 'var(--ink)',
            letterSpacing: '-0.025em',
            outline: 'none',
            border: 'none',
          }}
          aria-label={label}
        />

        <ScrubberButton
          aria-label="Increase"
          onClick={() => onChange(clamp(value + 1))}
          disabled={locked || value >= max}
        >
          +
        </ScrubberButton>
      </div>

      <div className="mt-3 text-[12px] leading-[1.5] text-[var(--ink-3)] md:text-[13px]">
        {hint}
      </div>
    </div>
  )
}

function ScrubberButton({
  onClick, disabled, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tp-tap flex size-[48px] items-center justify-center rounded-[12px] text-[26px] leading-none text-[var(--ink-2)] disabled:cursor-not-allowed disabled:opacity-40 md:size-[52px]"
      style={{ background: 'var(--paper-3)', border: '1px solid #D6DEF0' }}
      {...rest}
    >
      {children}
    </button>
  )
}
