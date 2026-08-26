import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from './ProfileForm'
import ChangePasswordForm from './ChangePasswordForm'
import { signOut } from './actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, catchphrase, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--rule)] bg-[var(--paper-2)] px-5 py-4 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-2.5 text-[var(--ink-2)] hover:text-[var(--ink)]">
          <span className="text-lg leading-none">‹</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Dashboard</span>
        </Link>
        <span className="font-serif text-[18px] font-bold uppercase leading-none tracking-[0.06em]">My Profile</span>
      </header>

      <section className="uso-hero relative overflow-hidden px-5 py-8 text-white md:px-8">
        <span aria-hidden className="pointer-events-none absolute -top-6 right-0 select-none whitespace-nowrap font-serif font-bold leading-none"
              style={{ fontSize: 'clamp(110px, 22vw, 170px)', color: '#fff', opacity: 0.08, letterSpacing: '-0.03em' }}>
          ME
        </span>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#B9CBF2' }}>Your account</div>
          <h1 className="mt-2 font-serif text-[30px] font-bold leading-[1.05] md:text-[38px]">{profile.display_name}</h1>
          <div className="mt-1.5 text-[15px] italic" style={{ color: '#DDE6FA' }}>
            {profile.catchphrase ?? 'No catchphrase yet.'}
          </div>
          <p className="mt-2 text-[11px]" style={{ color: '#B9CBF2' }}>{user.email}</p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-lg flex-1 px-5 pt-6 pb-10 md:px-8">
        <ProfileForm
          userId={user.id}
          initial={{
            display_name: profile.display_name,
            catchphrase: profile.catchphrase ?? null,
            avatar_url: profile.avatar_url ?? null,
          }}
        />

        <div className="mt-8">
          <ChangePasswordForm />
        </div>

        <form action={signOut} className="mt-8 border-t border-[var(--rule)] pt-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)] font-semibold mb-2">
            Sign out
          </div>
          <p className="text-[12px] text-[var(--ink-2)] mb-3">
            End this session on this device.
          </p>
          <button
            type="submit"
            className="w-full rounded-[12px] py-3 text-[11px] font-bold uppercase tracking-[0.16em]
                       border border-[var(--brick)] text-[var(--brick)] bg-transparent
                       hover:bg-[var(--brick)] hover:text-white transition-colors"
          >
            Sign out
          </button>
        </form>
      </main>
    </div>
  )
}
