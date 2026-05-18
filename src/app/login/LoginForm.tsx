'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'magic'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialError = searchParams.get('error') === 'auth_failed' ? 'Sign-in link expired or invalid.' : ''

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function sendMagicLink(e: React.FormEvent) {
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
      return
    }
    setMagicSent(true)
    setLoading(false)
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

        {magicSent ? (
          <div className="border border-[#1B181420] bg-[#F2EBDC] rounded-[2px] p-5 text-center">
            <div className="font-serif italic text-lg text-[#1B1814] mb-1">Check your email.</div>
            <p className="text-[12px] text-[#3C342C]">
              A sign-in link is on its way to <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={mode === 'password' ? signInWithPassword : sendMagicLink} className="space-y-4">
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

            {mode === 'password' && (
              <div className="space-y-1.5">
                <label htmlFor="password"
                       className="block text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                             text-[15px] text-[#1B1814] placeholder-[#1B181440]
                             focus:outline-none focus:border-[#B85433] transition-colors"
                />
              </div>
            )}

            {error && <p className="text-[12px] text-[#B85433]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[2px] text-[11px] uppercase tracking-[0.2em] font-semibold
                         bg-[#1B1814] text-[#FAF6EC] disabled:opacity-50 transition-opacity"
            >
              {loading
                ? (mode === 'password' ? 'Signing in…' : 'Sending…')
                : (mode === 'password' ? 'Sign in' : 'Send sign-in link')}
            </button>

            <button
              type="button"
              onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError('') }}
              className="block w-full text-center text-[11px] uppercase tracking-[0.18em] text-[#3C342C]
                         hover:text-[#B85433] transition-colors"
            >
              {mode === 'password' ? 'Email me a sign-in link instead' : 'Use password instead'}
            </button>
          </form>
        )}

        <div className="mt-10 border-t border-dotted border-[#1B181420] pt-5 text-center space-y-2">
          <p className="font-serif italic text-[13px] text-[#3C342C]">
            New here?{' '}
            <Link href="/signup" className="text-[#B85433] hover:text-[#8E3A1F] underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
