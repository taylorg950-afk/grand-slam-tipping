'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SlamShowcase, { usFont } from '../SlamShowcase'

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
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-4 md:p-8">
      <div
        className="login-shell w-full overflow-hidden rounded-[28px] bg-[var(--paper-2)]"
        style={{ maxWidth: 1140, boxShadow: '0 30px 80px -45px rgba(0,48,143,0.55)' }}
      >
        {/* Showcase — the four majors */}
        <SlamShowcase />

        {/* Sign-up */}
        <div className="px-6 py-9 md:px-10 md:py-12">
          <div className="login-mobilebrand mb-7 items-center gap-2.5">
            <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
            <span className={`${usFont.className} text-[20px] font-bold uppercase tracking-[0.06em]`}>The Tipping Post</span>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-3)]">Join the room</div>
          <h1 className={`${usFont.className} mt-1 text-[32px] font-bold uppercase tracking-[0.01em] md:text-[36px]`}>Pull up a chair</h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-[var(--ink-2)]">Create an account to file your first picks.</p>

          {verifySent ? (
            <div className="mt-7 rounded-[16px] p-5 text-center" style={{ background: 'var(--paper-3)' }}>
              <div className="mb-1.5 font-serif text-[22px] font-bold text-[var(--ink)]">Almost there.</div>
              <p className="m-0 text-[14px] text-[var(--ink-2)]">
                We sent a verification link to <b className="font-semibold text-[var(--ink)]">{email}</b>. Click it to finish signing up.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
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

          <p className="mt-6 text-center text-[13px] text-[var(--ink-2)]">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[var(--blue)] hover:text-[var(--brick)]">Sign in</Link>.
          </p>
        </div>
      </div>
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
        id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} autoFocus={autoFocus} minLength={minLength}
        className="block w-full rounded-[12px] px-3.5 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--brick)] focus:outline-none"
        style={{ background: 'var(--paper-2)', border: '1px solid #D6DEF0' }}
      />
    </div>
  )
}
