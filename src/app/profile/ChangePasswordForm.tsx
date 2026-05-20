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
    <form onSubmit={submit} className="space-y-4 border-t border-dotted border-[#1B181420] pt-6">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
        Change password
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new_password"
               className="block text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
          New password
        </label>
        <input
          id="new_password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                     text-[15px] text-[#1B1814] focus:outline-none focus:border-[#B85433] transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm_password"
               className="block text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
          Confirm new password
        </label>
        <input
          id="confirm_password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                     text-[15px] text-[#1B1814] focus:outline-none focus:border-[#B85433] transition-colors"
        />
      </div>

      {error && <p className="text-sm text-[#B85433]">{error}</p>}
      {ok && <p className="text-sm text-[#3D4F2B] font-medium">Password updated.</p>}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full py-3 rounded-[2px] text-[11px] uppercase tracking-[0.2em] font-semibold
                   bg-[#1B1814] text-[#FAF6EC] disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
