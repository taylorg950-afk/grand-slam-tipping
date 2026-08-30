'use client'

import { useActionState, useState } from 'react'
import { createTournament } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const SLAM_ROUNDS = [
  { name: 'R64', points: 2 },
  { name: 'R32', points: 4 },
  { name: 'R16', points: 8 },
  { name: 'QF',  points: 16 },
  { name: 'SF',  points: 32 },
  { name: 'F',   points: 64 },
]

export default function NewTournamentPage() {
  const [state, action, pending] = useActionState(createTournament, null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) setSlug(toSlug(value))
  }

  function handleSlugChange(value: string) {
    setSlug(value)
    setSlugEdited(true)
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">← Admin</Link>
        <h1 className="mt-2 font-serif text-[22px] font-bold uppercase tracking-[0.04em]">New tournament</h1>
      </div>

      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Roland Garros 2026"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="roland-garros-2026"
            value={slug}
            onChange={e => handleSlugChange(e.target.value)}
            required
          />
          <p className="text-xs text-[var(--ink-3)]">Used in URLs — lowercase, hyphens only.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" name="start_date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">End date</Label>
            <Input id="end_date" name="end_date" type="date" required />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="set_active" name="set_active" className="h-4 w-4 rounded border-[var(--rule)]" />
          <Label htmlFor="set_active">Set as active tournament</Label>
        </div>

        <div className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] p-4 space-y-2">
          <p className="text-xs font-medium text-[var(--ink-2)]">Grand Slam round preset (auto-created)</p>
          <div className="grid grid-cols-3 gap-1">
            {SLAM_ROUNDS.map(r => (
              <div key={r.name} className="text-xs text-[var(--ink-3)]">
                {r.name}: <span className="font-medium text-[var(--ink-2)]">{r.points} pts</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--ink-3)]">Points are editable after creation.</p>
        </div>

        {state?.error && (
          <p className="text-sm text-[var(--down)]">{state.error}</p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating…' : 'Create tournament'}
        </Button>
      </form>
    </div>
  )
}
