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
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      {/* Masthead */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">New subscribers</span>
      </header>

      {/* Hero */}
      <section className="uso-hero relative overflow-hidden px-5 py-9 text-white md:px-8 md:py-12">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
          style={{ fontSize: 'clamp(120px, 22vw, 190px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}
        >
          JOIN
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            Join the room · the four majors
          </div>
          <h1 className="mt-2 font-serif text-[34px] font-bold leading-[1] md:text-[48px]">Pull up a chair.</h1>
          <div className="mt-3 max-w-xl text-[14px] leading-[1.5]" style={{ color: '#DDE6FA' }}>
            Create an account to file your first picks before the next round locks. Each match scores 2–64 points by round; tiebreakers settle ties at the line.
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="flex-1 px-5 py-8 md:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="tp-card p-6 md:p-7">
            <h2 className="m-0 border-b border-[var(--rule)] pb-3 font-serif text-[20px] font-bold uppercase tracking-[0.04em]">Create account</h2>

            {verifySent ? (
              <div className="pt-5 text-center">
                <div className="mb-1.5 font-serif text-[22px] font-bold text-[var(--ink)]">Almost there.</div>
                <p className="m-0 text-[14px] text-[var(--ink-2)]">
                  We sent a verification link to <b className="font-semibold text-[var(--ink)]">{email}</b>. Click it to finish signing up.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-5">
                <Field id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus required />
                <Field id="displayName" label="Display name (optional)" type="text" value={displayName} onChange={setDisplayName} placeholder="defaults to your email name" />
                <Field id="password" label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />
                <Field id="confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm} required minLength={6} />

                {error && <p className="m-0 text-[12px] text-[var(--down)]">{error}</p>}

                <button type="submit" disabled={loading} className="tp-cta w-full disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? 'Creating account…' : 'Create account →'}
                </button>
              </form>
            )}

            <div className="mt-5 border-t border-[var(--rule)] pt-4 text-center">
              <p className="m-0 text-[13px] text-[var(--ink-2)]">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[var(--blue)] hover:text-[var(--brick)]">Sign in</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
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
        className="block w-full rounded-[12px] px-3.5 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:outline-none"
        style={{ background: 'var(--paper-2)', border: '1px solid #D6DEF0' }}
      />
    </div>
  )
}
