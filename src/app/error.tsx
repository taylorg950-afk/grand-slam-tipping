'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Route-level error boundary. In development Next's overlay covers this, so the
// only way to see it is to trip an error in a production build.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col bg-[var(--paper)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
        </Link>
      </header>

      <section className="uso-hero relative overflow-hidden px-5 py-9 text-white md:px-8 md:py-12">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
          style={{ fontSize: 'clamp(110px, 20vw, 180px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}
        >
          LET
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            Something went wrong
          </div>
          <h1 className="mt-2 font-serif text-[34px] font-bold leading-[1] md:text-[46px]">Let — play it again.</h1>
          <p className="mt-3 max-w-xl text-[14px] leading-[1.5]" style={{ color: '#DDE6FA' }}>
            The page didn&apos;t load. Your picks are safe — nothing is saved from this screen.
          </p>
        </div>
      </section>

      <section className="flex-1 px-5 py-8 md:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="tp-card p-6">
            <div className="flex flex-col gap-3">
              <button type="button" onClick={reset} className="tp-cta w-full text-center">
                Try again →
              </button>
              <Link href="/dashboard" className="tp-ghost block w-full text-center">
                Back to the dashboard
              </Link>
            </div>
            {error.digest && (
              <p className="m-0 mt-5 border-t border-[var(--rule)] pt-4 text-center text-[12px] text-[var(--ink-3)]">
                If it keeps happening, quote this: <span className="font-semibold text-[var(--ink-2)]">{error.digest}</span>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
