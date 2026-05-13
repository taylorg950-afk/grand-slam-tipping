'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 bg-[#FAF6EC] relative">
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1B1814 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="font-serif italic text-[28px] leading-none tracking-tight text-[#1B1814] mb-2">
            The Tipping Post
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#3C342C]">
            Grand Slam Tipping Competition
          </p>
        </div>

        {submitted ? (
          <div className="border border-[#1B181420] bg-[#F2EBDC] rounded-[2px] p-5 text-center">
            <div className="font-serif italic text-lg text-[#1B1814] mb-1">Check your email.</div>
            <p className="text-[12px] text-[#3C342C]">
              A sign-in link is on its way to <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email"
                     className="block text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                           text-[15px] text-[#1B1814] placeholder-[#1B181440]
                           focus:outline-none focus:border-[#B85433] transition-colors"
              />
            </div>

            {error && <p className="text-[12px] text-[#B85433]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[2px] text-[11px] uppercase tracking-[0.2em] font-semibold
                         bg-[#1B1814] text-[#FAF6EC] disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}

        <div className="mt-10 border-t border-dotted border-[#1B181420] pt-5 text-center">
          <p className="font-serif italic text-[13px] text-[#3C342C]">Private competition — invite only.</p>
        </div>
      </div>
    </main>
  )
}
