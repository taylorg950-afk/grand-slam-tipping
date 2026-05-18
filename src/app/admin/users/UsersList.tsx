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
    <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
      {users.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500">No users yet.</p>
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
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">{user.email || '(no email)'}</p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setMessage(null) }}
          className="text-sm text-zinc-500 hover:text-zinc-900"
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
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-zinc-900"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {message && (
        <p className={`mt-2 text-xs ${message.kind === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
