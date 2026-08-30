import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="flex min-h-screen flex-col bg-[var(--paper)]">
      <header className="border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <a href="/admin" className="flex items-center gap-3">
            <span aria-hidden className="size-[11px] rounded-full bg-[var(--spark)]" style={{ boxShadow: '0 0 0 3px rgba(217,236,60,0.25)' }} />
            <span className="font-serif text-[20px] font-bold uppercase leading-none tracking-[0.06em]">The Tipping Post</span>
            <span className="rounded-full bg-[var(--brick-surface)] px-2.5 py-1 font-serif text-[12px] font-semibold uppercase leading-none tracking-[0.14em] text-[var(--brick)]">
              Admin
            </span>
          </a>
          <nav className="flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <a href="/admin" className="text-[var(--ink-2)] hover:text-[var(--ink)]">Tournaments</a>
            <a href="/admin/picks" className="text-[var(--ink-2)] hover:text-[var(--ink)]">Picks status</a>
            <a href="/admin/users" className="text-[var(--ink-2)] hover:text-[var(--ink)]">Users</a>
            <a href="/dashboard" className="text-[var(--blue)] hover:text-[var(--brick)]">Back to app →</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 md:px-8">
        {children}
      </main>
    </div>
  )
}
