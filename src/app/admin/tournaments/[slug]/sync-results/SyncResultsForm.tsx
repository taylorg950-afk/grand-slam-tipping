'use client'

import { useActionState } from 'react'
import { syncResults, type SyncReport } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function Group({ title, tone, items }: {
  title: string
  tone: 'good' | 'warn' | 'bad' | 'quiet'
  items: string[]
}) {
  if (items.length === 0) return null
  const colour = {
    good: 'var(--olive)', warn: 'var(--brick)', bad: 'var(--down)', quiet: 'var(--ink-3)',
  }[tone]
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: colour }}>
        {title} ({items.length})
      </p>
      <ul className="m-0 list-none space-y-0.5 p-0">
        {items.map((t, i) => (
          <li key={i} className="text-xs text-[var(--ink-2)]">{t}</li>
        ))}
      </ul>
    </div>
  )
}

export default function SyncResultsForm({ slug, defaultUrl }: {
  slug: string
  defaultUrl?: string
}) {
  const [state, action, pending] = useActionState<SyncReport | null, FormData>(syncResults, null)

  const nothingDone =
    state && !state.error && state.applied.length === 0 && state.conflicts.length === 0

  return (
    <form action={action} className="space-y-3 rounded-lg border border-[var(--rule)] bg-[var(--brick-surface)] p-4">
      <input type="hidden" name="slug" value={slug} />

      <h2 className="text-sm font-medium text-[var(--brick)]">Pull results from Wikipedia</h2>
      <p className="text-xs text-[var(--blue)]">
        Reads the draw page and records any match that has finished since the last run, then moves
        winners into the next round. Matches still being played are skipped, and a result already
        entered here is never overwritten. Safe to run as often as you like.
      </p>

      <div className="space-y-1">
        <Label htmlFor="wiki_url" className="text-xs">Wikipedia draw page</Label>
        <Input
          id="wiki_url"
          name="url"
          type="url"
          required
          defaultValue={defaultUrl}
          placeholder="https://en.wikipedia.org/wiki/2026_US_Open_–_Men's_singles"
        />
      </div>

      {state?.error && <p className="text-sm text-[var(--down)]">{state.error}</p>}

      {state && !state.error && (
        <div className="space-y-3 rounded-md border border-[var(--rule)] bg-white p-3">
          {nothingDone && (
            <p className="text-sm text-[var(--ink-2)]">
              Nothing new — everything finished on that page is already recorded.
            </p>
          )}
          <Group title="Recorded" tone="good" items={state.applied} />
          <Group title="Into the next round" tone="good" items={state.advanced} />
          <Group title="Needs a look — page disagrees with what is recorded" tone="bad" items={state.conflicts} />
          <Group title="Could not match to this draw" tone="bad" items={state.mismatches} />
          <Group title="Still being played" tone="warn" items={state.inProgress} />
          {state.unchanged > 0 && (
            <p className="text-xs text-[var(--ink-3)]">
              {state.unchanged} already recorded and unchanged.
            </p>
          )}
        </div>
      )}

      <Button type="submit" disabled={pending} size="sm" variant="outline">
        {pending ? 'Reading the draw…' : 'Pull results'}
      </Button>
    </form>
  )
}
