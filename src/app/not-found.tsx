import Link from 'next/link'

export default function NotFound() {
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
          OUT
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>
            Page not found
          </div>
          <h1 className="mt-2 font-serif text-[34px] font-bold leading-[1] md:text-[46px]">Out — wide of the line.</h1>
          <p className="mt-3 max-w-xl text-[14px] leading-[1.5]" style={{ color: '#DDE6FA' }}>
            There&apos;s nothing at that address. It may have been a tournament that has since wrapped up.
          </p>
        </div>
      </section>

      <section className="flex-1 px-5 py-8 md:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="tp-card p-6 text-center">
            <Link href="/dashboard" className="tp-cta inline-block">
              Back to the dashboard →
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
