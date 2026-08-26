'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setOk(false)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setOk(true)
    setPassword('')
    setConfirm('')
    setLoading(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4 border-t border-[var(--rule)] pt-6">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)] font-semibold">
        Change password
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new_password"
               className="block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] font-semibold">
          New password
        </label>
        <input
          id="new_password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-[12px] border border-[#D6DEF0] bg-[var(--paper-2)] px-3.5 py-2.5
                     text-[15px] text-[var(--ink)] focus:outline-none focus:border-[var(--brick)] transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm_password"
               className="block text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] font-semibold">
          Confirm new password
        </label>
        <input
          id="confirm_password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-[12px] border border-[#D6DEF0] bg-[var(--paper-2)] px-3.5 py-2.5
                     text-[15px] text-[var(--ink)] focus:outline-none focus:border-[var(--brick)] transition-colors"
        />
      </div>

      {error && <p className="text-sm text-[var(--down)]">{error}</p>}
      {ok && <p className="text-sm text-[var(--olive)] font-medium">Password updated.</p>}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full rounded-[12px] py-3 text-[11px] font-bold uppercase tracking-[0.16em]
                   bg-[var(--brick)] text-white disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
