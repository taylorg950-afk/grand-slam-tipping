'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifySent, setVerifySent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { display_name: displayName.trim() || email.split('@')[0] },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setVerifySent(true)
      setLoading(false)
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
            Create your account
          </p>
        </div>

        {verifySent ? (
          <div className="border border-[#1B181420] bg-[#F2EBDC] rounded-[2px] p-5 text-center">
            <div className="font-serif italic text-lg text-[#1B1814] mb-1">Almost there.</div>
            <p className="text-[12px] text-[#3C342C]">
              We sent a verification link to <strong>{email}</strong>. Click it to finish signing up.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="displayName"
                     className="block text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="how should we list you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                           text-[15px] text-[#1B1814] placeholder-[#1B181440]
                           focus:outline-none focus:border-[#B85433] transition-colors"
              />
            </div>

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
                className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                           text-[15px] text-[#1B1814] placeholder-[#1B181440]
                           focus:outline-none focus:border-[#B85433] transition-colors"
              />
            </div>

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
                minLength={6}
                className="w-full rounded-[2px] border border-[#1B181430] bg-white px-3 py-2.5
                           text-[15px] text-[#1B1814] placeholder-[#1B181440]
                           focus:outline-none focus:border-[#B85433] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm"
                     className="block text-[10px] uppercase tracking-[0.18em] text-[#3C342C] font-semibold">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
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
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <div className="mt-10 border-t border-dotted border-[#1B181420] pt-5 text-center">
          <p className="font-serif italic text-[13px] text-[#3C342C]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#B85433] hover:text-[#8E3A1F] underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
