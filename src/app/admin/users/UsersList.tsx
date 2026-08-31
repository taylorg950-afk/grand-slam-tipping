'use client'

import { useState, useTransition } from 'react'
import { setUserPassword, deleteUser } from './actions'

interface User {
  id: string
  display_name: string
  email: string
  is_admin: boolean
  tipCount: number
  isMe: boolean
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
  // Two-step in-page confirm rather than a native dialog: it states exactly
  // what's about to be destroyed, and a stray Enter can't trigger it.
  const [confirming, setConfirming] = useState(false)
  const [gone, setGone] = useState(false)
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

  if (gone) {
    return (
      <div className="px-4 py-3 text-sm text-[var(--ink-3)]">
        <b className="text-[var(--ink-2)]">{user.display_name}</b> deleted.
      </div>
    )
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => { setOpen(o => !o); setConfirming(false); setMessage(null) }}
            className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]"
          >
            {open ? 'Cancel' : 'Set password'}
          </button>
          {!user.isMe && (
            <button
              type="button"
              onClick={() => { setConfirming(c => !c); setOpen(false); setMessage(null) }}
              className="text-sm text-[var(--ink-3)] hover:text-[var(--down)]"
            >
              {confirming ? 'Cancel' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mt-3 rounded-[12px] p-3" style={{ background: 'var(--paper-3)', border: '1px solid var(--rule)' }}>
          <p className="m-0 text-sm text-[var(--ink)]">
            Delete <b>{user.display_name}</b>
            {user.tipCount > 0 && <> and their {user.tipCount} {user.tipCount === 1 ? 'tip' : 'tips'}</>}?
            {user.is_admin && <> This account is an admin.</>}
          </p>
          <p className="m-0 mt-1 text-xs text-[var(--ink-3)]">This can&apos;t be undone.</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMessage(null)
                startTransition(async () => {
                  const result = await deleteUser(user.id)
                  if ('error' in result) setMessage({ kind: 'err', text: result.error })
                  else setGone(true)
                })
              }}
              className="rounded-[12px] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--down)' }}
            >
              {pending ? 'Deleting…' : `Yes, delete ${user.display_name}`}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
              Keep them
            </button>
          </div>
        </div>
      )}

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
