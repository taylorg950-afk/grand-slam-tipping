'use client'

import { useState, useTransition } from 'react'
import { setUserPassword } from './actions'

interface User {
  id: string
  display_name: string
  email: string
  is_admin: boolean
}

export default function UsersList({ users }: { users: User[] }) {
  return (
    <div className="divide-y divide-[var(--rule)] rounded-lg border border-[var(--rule)] bg-white">
      {users.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[var(--ink-3)]">No users yet.</p>
      ) : (
        users.map(u => <UserRow key={u.id} user={u} />)
      )}
    </div>
  )
}

function UserRow({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const formData = new FormData()
    formData.set('password', password)
    startTransition(async () => {
      const result = await setUserPassword(user.id, formData)
      if ('error' in result) {
        setMessage({ kind: 'err', text: result.error })
      } else {
        setMessage({ kind: 'ok', text: 'Password updated.' })
        setPassword('')
      }
    })
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{user.display_name}</span>
            {user.is_admin && (
              <span className="rounded-full bg-[var(--paper-3)] px-2 py-0.5 text-xs font-medium text-[var(--ink-2)]">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--ink-3)]">{user.email || '(no email)'}</p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setMessage(null) }}
          className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          {open ? 'Cancel' : 'Set password'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="flex-1 rounded-md border border-[var(--rule)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--ink)]"
          />
          <button
            type="submit"
            disabled={pending}
            className="tp-cta disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {message && (
        <p className={`mt-2 text-xs ${message.kind === 'ok' ? 'text-[var(--olive)]' : 'text-[var(--down)]'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
