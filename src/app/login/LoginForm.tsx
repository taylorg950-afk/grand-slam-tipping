'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'password' | 'magic' | 'reset'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialError = searchParams.get('error') === 'auth_failed' ? 'Sign-in link expired or invalid.' : ''

  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magicSent, setMagicSent] = useState(false)
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
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      {/* Masthead */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">Members only</span>
      </header>

      {/* Hero */}
      <section className="uso-hero relative overflow-hidden px-5 py-9 text-white md:px-8 md:py-12">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
          style={{ fontSize: 'clamp(120px, 22vw, 190px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}
        >
          SLAM
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            Grand Slam tipping · the four majors
          </div>
          <h1 className="mt-2 font-serif text-[34px] font-bold leading-[1] md:text-[48px]">Welcome back.</h1>
          <div className="mt-3 max-w-xl text-[14px] leading-[1.5]" style={{ color: '#DDE6FA' }}>
            File your picks, check the standings, and see who&apos;s ahead. Picks lock at first serve; tiebreakers settle the table at the line.
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="flex-1 px-5 py-8 md:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="tp-card p-6 md:p-7">
            <h2 className="m-0 border-b border-[var(--rule)] pb-3 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">
              {mode === 'reset' ? 'Reset password' : 'Sign in'}
            </h2>

            {magicSent || resetSent ? (
              <div className="pt-5 text-center">
                <div className="mb-1.5 font-serif text-[22px] font-bold text-[var(--ink)]">Check your email.</div>
                <p className="m-0 text-[14px] text-[var(--ink-2)]">
                  {resetSent ? 'A password reset link' : 'A sign-in link'} is on its way to{' '}
                  <b className="font-semibold text-[var(--ink)]">{email}</b>.
                </p>
                {resetSent && (
                  <button
                    type="button"
                    onClick={() => { setMode('password'); setResetSent(false) }}
                    className="tp-ghost mt-5 block w-full text-center"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            ) : (
              <form
                onSubmit={
                  mode === 'password' ? signInWithPassword
                  : mode === 'magic' ? sendMagicLink
                  : sendResetLink
                }
                className="space-y-4 pt-5"
              >
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoFocus
                  required
                />

                {mode === 'password' && (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="password" className="tp-eyebrow block">Password</label>
                      <button
                        type="button"
                        onClick={() => { setMode('reset'); setError('') }}
                        className="text-[12px] font-semibold text-[var(--blue)] hover:text-[var(--brick)]"
                      >
                        Forgot?
                      </button>
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="block w-full rounded-[12px] px-3.5 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
                      style={{ background: 'var(--paper-2)', border: '1px solid #D6DEF0' }}
                    />
                  </div>
                )}

                {error && <p className="m-0 text-[12px] text-[var(--down)]">{error}</p>}

                <button type="submit" disabled={loading} className="tp-cta w-full disabled:cursor-not-allowed disabled:opacity-50">
                  {loading
                    ? mode === 'password' ? 'Signing in…' : 'Sending…'
                    : mode === 'password' ? 'Sign in →'
                    : mode === 'magic' ? 'Send sign-in link →'
                    : 'Send reset link →'}
                </button>

                {mode !== 'reset' && (
                  <button
                    type="button"
                    onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError('') }}
                    className="tp-ghost block w-full text-center"
                  >
                    {mode === 'password' ? 'Email me a link instead' : 'Use password instead'}
                  </button>
                )}

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => { setMode('password'); setError('') }}
                    className="tp-ghost block w-full text-center"
                  >
                    Back to sign in
                  </button>
                )}
              </form>
            )}

            <div className="mt-5 border-t border-[var(--rule)] pt-4 text-center">
              <p className="m-0 text-[13px] text-[var(--ink-2)]">
                New here?{' '}
                <Link href="/signup" className="font-semibold text-[var(--blue)] hover:text-[var(--brick)]">
                  Pull up a chair
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--rule)] px-5 pb-10 pt-7 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2.5">
            <h2 className="m-0 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">How it works</h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">Four things to know</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <HowStep n="1" heading="Call every tie">
              Pick a winner for each match of the round — change your mind as often as you like before first serve.
            </HowStep>
            <HowStep n="2" heading="Points double each round">
              A correct call early on is pocket change; a correct call in the final is a small fortune.
            </HowStep>
            <HowStep n="3" heading="Locked at first serve">
              Each match locks at its scheduled start. Then the room&apos;s picks go on the table for everyone to see.
            </HowStep>
            <HowStep n="4" heading="Settled at the line">
              Level at the end? Closest on predicted total games in the finals takes the table.
            </HowStep>
          </div>
        </div>
      </section>
    </main>
  )
}

function HowStep({ n, heading, children }: { n: string; heading: string; children: React.ReactNode }) {
  return (
    <div className="tp-card p-4">
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif text-[26px] font-bold leading-none text-[var(--blue)]">{n}</span>
        <h3 className="m-0 text-[15px] font-semibold leading-tight text-[var(--ink)]">{heading}</h3>
      </div>
      <p className="m-0 mt-2 text-[13px] leading-[1.55] text-[var(--ink-2)]">{children}</p>
    </div>
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
  minLength?: number
}

function Field({ id, label, type, value, onChange, placeholder, required, autoFocus, minLength }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="tp-eyebrow block">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        minLength={minLength}
        className="block w-full rounded-[12px] px-3.5 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
        style={{ background: 'var(--paper-2)', border: '1px solid #D6DEF0' }}
      />
    </div>
  )
}
