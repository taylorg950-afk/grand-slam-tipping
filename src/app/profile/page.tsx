import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from './ProfileForm'

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
    <div className="min-h-screen flex flex-col bg-[#FAF6EC] text-[#1B1814] relative">
      <div aria-hidden className="fixed inset-0 opacity-[0.06] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1B1814 0.5px, transparent 0)', backgroundSize: '3px 3px' }} />

      <header className="relative z-10 border-b border-[#1B181420] px-5 py-3.5 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-3 text-[#3C342C]">
          <span className="text-lg leading-none">‹</span>
          <span className="text-[10px] uppercase tracking-[0.18em]">Dashboard</span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#1B181430]">·</span>
        <span className="font-serif italic text-[18px] leading-none">My Profile</span>
      </header>

      <section className="relative z-10 px-5 py-5 overflow-hidden text-[#FAF6EC]"
               style={{ background: 'linear-gradient(180deg, #B85433 0%, #8E3A1F 100%)' }}>
        <div aria-hidden className="absolute -right-8 -top-3 text-[140px] leading-none italic
                                    font-serif text-white/[0.06] select-none pointer-events-none">
          ME
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 mb-1">Your account</div>
        <h1 className="font-serif text-3xl leading-[1.05] tracking-tight">
          {profile.display_name}
          <br />
          <span className="italic text-[#F2EBDC] text-xl">
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
      </main>
    </div>
  )
}
