'use client'

import { useActionState } from 'react'
import { saveTiebreaker } from './actions'

interface Props {
  tournamentId: string
  slug: string
  existing: { mens: number | null; womens: number | null }
  locked: boolean
}

export default function TiebreakerForm({ tournamentId, slug, existing, locked }: Props) {
  const [state, action, pending] = useActionState(saveTiebreaker, null)

  if (locked) {
    return (
      <div className="space-y-4">
        <div className="rounded-[2px] border border-[#1B181420] bg-[#F2EBDC] px-4 py-3
                        text-[10px] uppercase tracking-[0.18em] text-[#3C342C]">
          Predictions locked — men&apos;s final has begun
        </div>
        <Prediction label="Men's final — total games" value={existing.mens} />
        <Prediction label="Women's final — total games" value={existing.womens} />
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="slug" value={slug} />

      <Field
        id="mens_final_total_games"
        label="Men's final — total games"
        hint="e.g. a 6-4 6-3 6-2 final = 27 games"
        defaultValue={existing.mens ?? ''}
      />

      <Field
        id="womens_final_total_games"
        label="Women's final — total games"
        hint="e.g. a 6-4 6-3 final = 19 games"
        defaultValue={existing.womens ?? ''}
      />

      {state?.error && (
        <p className="text-sm text-[#B85433]">{state.error}</p>
      )}

      {state?.ok && !state?.error && (
        <p className="text-sm text-[#3D4F2B] font-medium">Saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-[2px] text-[11px] uppercase tracking-[0.2em] font-semibold
                   bg-[#1B1814] text-[#FAF6EC] disabled:opacity-50 transition-opacity"
      >
        {pending ? 'Saving…' : existing.mens !== null || existing.womens !== null ? 'Update prediction' : 'Save prediction'}
      </button>
    </form>
  )
}

function Field({ id, label, hint, defaultValue }: {
  id: string
  label: string
  hint: string
  defaultValue: number | string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        min={1}
        max={200}
        defaultValue={defaultValue}
        placeholder="e.g. 27"
        className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                   text-[15px] text-[#1B1814] placeholder-[#1B181440]
                   focus:outline-none focus:border-[#B85433] transition-colors"
      />
      <p className="text-[10px] text-[#3C342C] opacity-70">{hint}</p>
    </div>
  )
}

function Prediction({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-baseline justify-between py-3 border-b border-dotted border-[#1B181420]">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#3C342C]">{label}</span>
      <span className="font-serif italic text-2xl text-[#1B1814]">
        {value !== null ? value : <span className="text-[#1B181440] text-base not-italic font-sans">—</span>}
      </span>
    </div>
  )
}
