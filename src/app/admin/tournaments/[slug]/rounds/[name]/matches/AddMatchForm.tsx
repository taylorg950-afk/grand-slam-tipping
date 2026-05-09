'use client'

import { useActionState, useRef } from 'react'
import { addMatch } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AddMatchForm({
  roundId,
  roundName,
  slug,
}: {
  roundId: string
  roundName: string
  slug: string
}) {
  const [state, action, pending] = useActionState(addMatch, null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleAction(formData: FormData) {
    await action(formData)
    formRef.current?.reset()
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      <input type="hidden" name="round_id" value={roundId} />
      <input type="hidden" name="round_name" value={roundName} />
      <input type="hidden" name="slug" value={slug} />

      <h2 className="text-sm font-medium">Add match</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="player1_name">Player 1</Label>
          <Input id="player1_name" name="player1_name" placeholder="Jannik Sinner" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="player2_name">Player 2</Label>
          <Input id="player2_name" name="player2_name" placeholder="Carlos Alcaraz" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="draw">Draw</Label>
          <select
            id="draw"
            name="draw"
            required
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="mens">Men&apos;s</option>
            <option value="womens">Women&apos;s</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="scheduled_start">Start time (UTC)</Label>
          <Input id="scheduled_start" name="scheduled_start" type="datetime-local" required />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Adding…' : 'Add match'}
      </Button>
    </form>
  )
}
