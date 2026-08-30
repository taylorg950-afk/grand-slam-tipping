'use client'

import { useActionState } from 'react'
import { generateFromPreviousRound } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function GenerateMatchesForm({
  roundId,
  roundName,
  prevRoundName,
  slug,
}: {
  roundId: string
  roundName: string
  prevRoundName: string
  slug: string
}) {
  const [state, action, pending] = useActionState(generateFromPreviousRound, null)

  return (
    <form action={action} className="space-y-3 rounded-lg border border-[var(--rule)] bg-[var(--brick-surface)] p-4">
      <input type="hidden" name="round_id" value={roundId} />
      <input type="hidden" name="round_name" value={roundName} />
      <input type="hidden" name="slug" value={slug} />

      <h2 className="text-sm font-medium text-[var(--brick)]">
        Generate {roundName} matches from {prevRoundName} results
      </h2>
      <p className="text-xs text-[var(--blue)]">
        Creates matches based on {prevRoundName} winners using bracket positions. Safe to re-run — existing matches are updated in place, not duplicated.
      </p>

      <div className="space-y-1">
        <Label htmlFor="gen_scheduled_start" className="text-xs">Match start time (AEST)</Label>
        <Input
          id="gen_scheduled_start"
          name="scheduled_start"
          type="datetime-local"
          required
          className="max-w-xs"
        />
      </div>

      {state?.error && <p className="text-sm text-[var(--down)]">{state.error}</p>}
      {state && !state.error && (
        <p className="text-sm text-[var(--olive)]">
          Done — {state.created} created, {state.updated} updated.
        </p>
      )}

      <Button type="submit" disabled={pending} size="sm" variant="outline">
        {pending ? 'Generating…' : `Generate from ${prevRoundName}`}
      </Button>
    </form>
  )
}
