'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SlamShowcase, { usFont } from '../SlamShowcase'

type Mode = 'password' | 'reset'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialError = searchParams.get('error') === 'auth_failed' ? 'Sign-in link expired or invalid.' : ''

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)
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

  async function sendResetLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setResetSent(true)
    setLoading(false)
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-4 md:p-8">
      <div
        className="login-shell w-full overflow-hidden rounded-[28px] bg-[var(--paper-2)]"
        style={{ maxWidth: 1140, boxShadow: '0 30px 80px -45px rgba(0,48,143,0.55)' }}
      >
        {/* Showcase — the four majors */}
        <SlamShowcase />

        {/* Sign-in */}
        <div className="px-6 py-9 md:px-10 md:py-12">
          <div className="login-mobilebrand mb-7 items-center gap-2.5">
            <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
            <span className={`${usFont.className} text-[20px] font-bold uppercase tracking-[0.06em]`}>The Tipping Post</span>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-3)]">Members entrance</div>
          <h1 className={`${usFont.className} mt-1 text-[32px] font-bold uppercase tracking-[0.01em] md:text-[36px]`}>
            {mode === 'reset' ? 'Reset password' : 'Sign in to tip'}
          </h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-[var(--ink-2)]">
            {mode === 'reset'
              ? 'Give us your email and we’ll send a link to set a new password.'
              : 'Already a member? Sign in. First time here? Create an account.'}
          </p>

          {resetSent ? (
            <div className="mt-7 rounded-[16px] p-5 text-center" style={{ background: 'var(--paper-3)' }}>
              <div className="mb-1.5 font-serif text-[22px] font-bold text-[var(--ink)]">Check your email.</div>
              <p className="m-0 text-[14px] text-[var(--ink-2)]">
                A password reset link is on its way to <b className="font-semibold text-[var(--ink)]">{email}</b>.
              </p>
              {resetSent && (
                <button type="button" onClick={() => { setMode('password'); setResetSent(false) }} className="tp-ghost mt-5 block w-full text-center">
                  Back to sign in
                </button>
              )}
            </div>
          ) : (
            <form
              onSubmit={mode === 'password' ? signInWithPassword : sendResetLink}
              className="mt-7 space-y-4"
            >
              <Field id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus required />

              {mode === 'password' && (
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="password" className="tp-eyebrow block">Password</label>
                    <button type="button" onClick={() => { setMode('reset'); setError('') }} className="text-[12px] font-semibold text-[var(--blue)] hover:text-[var(--brick)]">
                      Forgot?
                    </button>
                  </div>
                  <input
                    id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                    className="block w-full rounded-[12px] px-3.5 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--brick)] focus:outline-none"
                    style={{ background: 'var(--paper-2)', border: '1px solid #D6DEF0' }}
                  />
                </div>
              )}

              {error && <p className="m-0 text-[12px] text-[var(--down)]">{error}</p>}

              <button type="submit" disabled={loading} className="tp-cta w-full disabled:cursor-not-allowed disabled:opacity-50">
                {loading
                  ? mode === 'password' ? 'Signing in…' : 'Sending…'
                  : mode === 'password' ? 'Sign in →'
                  : 'Send reset link →'}
              </button>

              {mode === 'password' ? (
                <>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="h-px flex-1" style={{ background: 'var(--rule)' }} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">First time here?</span>
                    <span className="h-px flex-1" style={{ background: 'var(--rule)' }} />
                  </div>
                  <Link href="/signup" className="tp-cta-outline block w-full text-center">
                    Create an account →
                  </Link>
                </>
              ) : (
                <button type="button" onClick={() => { setMode('password'); setError('') }} className="tp-ghost block w-full text-center">
                  Back to sign in
                </button>
              )}
            </form>
          )}

          {/* How it plays */}
          <div className="mt-8 border-t border-[var(--rule)] pt-6">
            <div className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-3)]">How it plays</div>
            <ol className="m-0 list-none space-y-3 p-0">
              <HowStep n="1">Pick every match, round by round — later rounds are worth more.</HowStep>
              <HowStep n="2">Watch the room: back the favourite or go against the grain.</HowStep>
              <HowStep n="3">Each slam keeps its own leaderboard — a fresh start every major.</HowStep>
            </ol>
          </div>

          <p className="mt-6 text-center text-[12px] text-[var(--ink-3)]">Private league · invite only.</p>
        </div>
      </div>
    </main>
  )
}

function HowStep({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-[var(--blue)]" style={{ background: 'var(--brick-surface)' }}>{n}</span>
      <span className="text-[14px] leading-[1.45] text-[var(--ink-2)]">{children}</span>
    </li>
  )
}

interface FieldProps {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
}

function Field({ id, label, type, value, onChange, placeholder, required, autoFocus }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="tp-eyebrow block">{label}</label>
      <input
        id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} autoFocus={autoFocus}
        className="block w-full rounded-[12px] px-3.5 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--brick)] focus:outline-none"
        style={{ background: 'var(--paper-2)', border: '1px solid #D6DEF0' }}
      />
    </div>
  )
}
