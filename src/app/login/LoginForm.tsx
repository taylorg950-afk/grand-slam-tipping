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
    <main className="relative flex min-h-screen flex-col">
      <div aria-hidden className="tp-paper-grain" />

      {/* Broadsheet masthead */}
      <header className="relative z-10 border-b-[3px] border-double border-[var(--ink)] px-4 pt-6 md:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--rule)] pb-3 text-[9px] uppercase tracking-[0.2em] text-[var(--ink-2)] md:text-[10px]">
          <span>Vol. I · The doors</span>
          <span className="hidden md:inline">A private sports broadsheet</span>
          <span>Members only</span>
        </div>
        <h1 className="m-0 mb-1.5 mt-4 text-center font-serif italic leading-none tracking-tight text-[42px] md:mb-2 md:mt-5 md:text-[84px]">
          The Tipping Post
        </h1>
        <div className="pb-3 text-center text-[8px] uppercase tracking-[0.28em] text-[var(--ink-2)] md:pb-4 md:text-[10px] md:tracking-[0.35em]">
          Grand Slam tipping for the room
        </div>
      </header>

      {/* Above the fold — lead + form */}
      <div className="relative z-10 flex-1 px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-[3fr_2fr] md:gap-14">
          {/* Lead column */}
          <article>
            <div className="tp-eyebrow tp-eyebrow--brick mb-3">From the door</div>
            <h2 className="m-0 mb-5 font-serif tracking-tight text-[34px] leading-[1.05] md:text-[52px] md:leading-[1.04]">
              Welcome back.
              <br />
              <span className="italic">Pick up where you left off.</span>
            </h2>
            <p className="m-0 mb-4 font-serif italic text-[15px] leading-[1.4] text-[var(--ink-2)] md:text-[17px]">
              A private tipping comp for the four Slams — clay, grass, hard, the lot.
            </p>
            <p className="m-0 max-w-[520px] font-sans text-[14px] leading-[1.55] text-[var(--ink-2)]">
              Sign in to file your picks, check the standings, and see who&apos;s ahead. Picks lock at the start of each match; tiebreakers settle the table at the line.
            </p>
          </article>

          {/* Form column */}
          <aside className="tp-card self-start p-5 md:p-7">
            <div className="tp-eyebrow mb-1 border-b-2 border-[var(--ink)] pb-2">
              {mode === 'reset' ? 'Reset password' : 'Sign in'}
            </div>

            {magicSent || resetSent ? (
              <div className="pt-4 text-center">
                <div className="mb-1 font-serif italic text-[20px] text-[var(--ink)]">Check your email.</div>
                <p className="m-0 text-[13px] text-[var(--ink-2)]">
                  {resetSent ? 'A password reset link' : 'A sign-in link'} is on its way to{' '}
                  <b className="font-medium text-[var(--ink)]">{email}</b>.
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
                className="space-y-4 pt-4"
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
                        className="font-serif italic text-[12px] text-[var(--brick)] hover:text-[var(--brick-dark)] underline underline-offset-2"
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
                      className="block w-full border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-4)] focus:border-[var(--brick)] focus:outline-none"
                    />
                  </div>
                )}

                {error && <p className="m-0 text-[12px] text-[var(--brick)]">{error}</p>}

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

            <div className="mt-5 border-t border-dotted border-[var(--rule)] pt-4 text-center">
              <p className="m-0 font-serif italic text-[13px] text-[var(--ink-2)]">
                New here?{' '}
                <Link href="/signup" className="text-[var(--brick)] underline underline-offset-2 hover:text-[var(--brick-dark)]">
                  Pull up a chair
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Below the fold — how it works */}
      <section className="relative z-10 border-t-[3px] border-double border-[var(--ink)] px-4 pb-9 pt-6 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
            <h2 className="m-0 font-serif text-[20px] tracking-tight md:text-[22px]">How it works</h2>
            <span className="tp-eyebrow">Four things to know</span>
          </div>
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 md:grid-cols-4">
            <HowStep n="1" heading="Call every tie">
              Pick a winner for each match of the round — change your mind as often
              as you like before first serve.
            </HowStep>
            <HowStep n="2" heading="Points double each round">
              A correct call early on is pocket change; a correct call in the final
              is a small fortune.
            </HowStep>
            <HowStep n="3" heading="Locked at first serve">
              Each match locks at its scheduled start. Then the room&apos;s picks go
              on the table for everyone to see.
            </HowStep>
            <HowStep n="4" heading="Settled at the line">
              Level at the end? Closest on predicted total games in the finals takes
              the table.
            </HowStep>
          </div>
          <p className="m-0 mt-6 text-center font-serif italic text-[13px] text-[var(--ink-3)]">
            The full house rules — walkovers, tiebreakers, the umpire&apos;s chair — live under Rules once you&apos;re in.
          </p>
        </div>
      </section>

      {/* Closing line */}
      <footer className="relative z-10 border-t border-[var(--rule)] px-4 py-5 text-center md:px-8">
        <span className="font-serif italic text-[13px] text-[var(--ink-3)]">
          Tipping&apos;s a long game. Glad you&apos;re back.
        </span>
      </footer>
    </main>
  )
}

function HowStep({ n, heading, children }: { n: string; heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-serif italic text-[26px] leading-none text-[var(--brick)]">{n}</span>
        <h3 className="m-0 font-serif text-[16px] leading-tight tracking-tight">{heading}</h3>
      </div>
      <p className="m-0 mt-2 font-sans text-[13px] leading-[1.55] text-[var(--ink-2)]">{children}</p>
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
        className="block w-full border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-4)] focus:border-[var(--brick)] focus:outline-none"
      />
    </div>
  )
}
