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
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)] relative">
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--ink) 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      <header className="relative z-10 border-b border-[#15231B20] px-5 py-3.5 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-3 text-[var(--ink-2)]">
          <span className="text-lg leading-none">‹</span>
          <span className="text-[10px] uppercase tracking-[0.18em]">Dashboard</span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#15231B30]">·</span>
        <span className="font-serif italic text-[18px] leading-none">My Profile</span>
      </header>

      <section className="relative z-10 px-5 py-5 overflow-hidden text-[var(--paper)]"
               style={{ background: 'linear-gradient(180deg, var(--brick) 0%, var(--brick-dark) 100%)' }}>
        <div aria-hidden className="absolute -right-8 -top-3 text-[140px] leading-none italic
                                    font-serif text-white/[0.06] select-none pointer-events-none">
          ME
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1">Your account</div>
        <h1 className="font-serif text-3xl leading-[1.05] tracking-tight">
          {profile.display_name}
          <br />
          <span className="italic text-[var(--paper-2)] text-xl">
            {profile.catchphrase ?? 'No catchphrase yet.'}
          </span>
        </h1>
        <p className="mt-2 text-[10px] text-white/60">{user.email}</p>
      </section>

      <main className="relative z-10 flex-1 px-5 pt-6 pb-10">
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

        <form action={signOut} className="mt-8 border-t border-dotted border-[#15231B20] pt-6">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] font-semibold mb-3">
            Sign out
          </div>
          <p className="text-[12px] text-[var(--ink-2)] opacity-70 mb-3">
            End this session on this device.
          </p>
          <button
            type="submit"
            className="w-full py-3 rounded-[2px] text-[11px] uppercase tracking-[0.2em] font-semibold
                       border border-[var(--brick)] text-[var(--brick)] bg-transparent
                       hover:bg-[var(--brick)] hover:text-[var(--paper)] transition-colors"
          >
            Sign out
          </button>
        </form>
      </main>
    </div>
  )
}
