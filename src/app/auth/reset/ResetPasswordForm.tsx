'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-4 pt-4">
      {email && (
        <p className="m-0 text-[12px] text-[var(--ink-2)]">
          Signed in as <b className="font-medium text-[var(--ink)]">{email}</b>.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="reset_password" className="tp-eyebrow block">New password</label>
        <input
          id="reset_password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoFocus
          autoComplete="new-password"
          className="block w-full border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 text-[15px] text-[var(--ink)] focus:border-[var(--brick)] focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="reset_confirm" className="tp-eyebrow block">Confirm new password</label>
        <input
          id="reset_confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="block w-full border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 text-[15px] text-[var(--ink)] focus:border-[var(--brick)] focus:outline-none"
        />
      </div>

      {error && <p className="m-0 text-[12px] text-[var(--brick)]">{error}</p>}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="tp-cta w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Updating…' : 'Set new password →'}
      </button>
    </form>
  )
}
