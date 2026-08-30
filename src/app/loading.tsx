// Shown while a server page waits on Supabase. Renders the masthead and hero
// bands so navigation lands on the app's shape rather than a blank frame.
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--paper)]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
          <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em] md:text-[22px]">The Tipping Post</span>
        </div>
      </header>

      <section className="uso-hero px-5 py-9 md:px-8 md:py-12">
        <div className="tp-skeleton h-3 w-40 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }} />
        <div className="tp-skeleton mt-3.5 h-8 w-[min(420px,80%)] rounded-[6px]" style={{ background: 'rgba(255,255,255,0.16)' }} />
        <div className="tp-skeleton mt-3 h-3 w-[min(300px,60%)] rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
      </section>

      <section className="flex-1 px-5 py-8 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="tp-card p-5">
              <div className="tp-skeleton h-2.5 w-16 rounded-full" />
              <div className="tp-skeleton mt-3 h-7 w-14 rounded-[6px]" />
              <div className="tp-skeleton mt-3 h-2.5 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <div className="tp-card mt-4 p-5">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="tp-skeleton size-8 rounded-full" />
              <div className="tp-skeleton h-3 flex-1 rounded-full" style={{ maxWidth: 180 }} />
              <div className="tp-skeleton h-3 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
