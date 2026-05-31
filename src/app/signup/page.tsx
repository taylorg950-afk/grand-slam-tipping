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
    <main className="relative flex min-h-screen flex-col">
      <div aria-hidden className="tp-paper-grain" />

      {/* Broadsheet masthead */}
      <header className="relative z-10 border-b-[3px] border-double border-[var(--ink)] px-4 pt-6 md:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--rule)] pb-3 text-[9px] uppercase tracking-[0.2em] text-[var(--ink-2)] md:text-[10px]">
          <span>Vol. I · The doors</span>
          <span className="hidden md:inline">A private sports broadsheet</span>
          <span>New subscribers</span>
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
            <div className="tp-eyebrow tp-eyebrow--brick mb-3">Join the room</div>
            <h2 className="m-0 mb-5 font-serif tracking-tight text-[34px] leading-[1.05] md:text-[52px] md:leading-[1.04]">
              Pull up a chair.
              <br />
              <span className="italic">The comp opens its doors.</span>
            </h2>
            <p className="m-0 mb-4 font-serif italic text-[15px] leading-[1.4] text-[var(--ink-2)] md:text-[17px]">
              Eight tippers, one trophy, four Slams a year — clay, grass, hard, repeat.
            </p>
            <p className="m-0 max-w-[520px] font-sans text-[14px] leading-[1.55] text-[var(--ink-2)]">
              Create an account to file your first picks before the next round locks. Each match scores 2–64 points depending on the round; tiebreakers settle ties at the line. Sentence case, no chirpy banners, no notifications you didn&apos;t ask for.
            </p>
          </article>

          {/* Form column */}
          <aside className="tp-card self-start p-5 md:p-7">
            <div className="tp-eyebrow mb-1 border-b-2 border-[var(--ink)] pb-2">Create account</div>

            {verifySent ? (
              <div className="pt-4 text-center">
                <div className="mb-1 font-serif italic text-[20px] text-[var(--ink)]">Almost there.</div>
                <p className="m-0 text-[13px] text-[var(--ink-2)]">
                  We sent a verification link to <b className="font-medium text-[var(--ink)]">{email}</b>. Click it to finish signing up.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
                <Field
                  id="displayName"
                  label="Display name (optional)"
                  type="text"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="defaults to your email name"
                />
                <Field
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={6}
                />
                <Field
                  id="confirm"
                  label="Confirm password"
                  type="password"
                  value={confirm}
                  onChange={setConfirm}
                  required
                  minLength={6}
                />

                {error && <p className="m-0 text-[12px] text-[var(--brick)]">{error}</p>}

                <button type="submit" disabled={loading} className="tp-cta w-full disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? 'Creating account…' : 'Create account →'}
                </button>
              </form>
            )}

            <div className="mt-5 border-t border-dotted border-[var(--rule)] pt-4 text-center">
              <p className="m-0 font-serif italic text-[13px] text-[var(--ink-2)]">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--brick)] underline underline-offset-2 hover:text-[var(--brick-dark)]">
                  Sign in
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </div>

      <footer className="relative z-10 border-t border-[var(--rule)] px-4 py-5 text-center md:px-8">
        <span className="font-serif italic text-[13px] text-[var(--ink-3)]">
          Pull up a chair, file your picks. We&apos;ll save you a seat.
        </span>
      </footer>
    </main>
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
