import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordForm from './ResetPasswordForm'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // The reset link goes through /auth/callback first, which exchanges the
  // recovery code for a session. If we don't have a session here, the link
  // is stale or unauthorised — bounce to login.
  if (!user) redirect('/login?error=auth_failed')

  return (
    <main className="relative flex min-h-screen flex-col">
      <div aria-hidden className="tp-paper-grain" />

      <header className="relative z-10 border-b-[3px] border-double border-[var(--ink)] px-4 pt-6 md:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--rule)] pb-3 text-[9px] uppercase tracking-[0.2em] text-[var(--ink-2)] md:text-[10px]">
          <span>Vol. I · The doors</span>
          <span className="hidden md:inline">A private sports broadsheet</span>
          <span>Members only</span>
        </div>
        <h1 className="m-0 mb-1.5 mt-4 text-center font-serif italic leading-none tracking-tight text-[42px] md:mb-2 md:mt-5 md:text-[84px]">
          The Tipping Post
        </h1>
        <div className="pb-3 text-center text-[8px] uppercase tracking-[0.28em] text-[var(--ink-2)] md:pb-4 md:text-[10px] md:tracking-[0.35em]">
          Grand Slam tipping for the room
        </div>
      </header>

      <div className="relative z-10 flex-1 px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-[3fr_2fr] md:gap-14">
          <article>
            <div className="tp-eyebrow tp-eyebrow--brick mb-3">Reset password</div>
            <h2 className="m-0 mb-5 font-serif tracking-tight text-[34px] leading-[1.05] md:text-[52px] md:leading-[1.04]">
              New password,
              <br />
              <span className="italic">same seat at the table.</span>
            </h2>
            <p className="m-0 max-w-[520px] font-sans text-[14px] leading-[1.55] text-[var(--ink-2)]">
              You&apos;re signed in via the recovery link. Pick a new password and we&apos;ll get you back to the dashboard.
            </p>
          </article>

          <aside className="tp-card self-start p-5 md:p-7">
            <div className="tp-eyebrow mb-1 border-b-2 border-[var(--ink)] pb-2">Set new password</div>
            <ResetPasswordForm email={user.email ?? ''} />
          </aside>
        </div>
      </div>

      <footer className="relative z-10 border-t border-[var(--rule)] px-4 py-5 text-center md:px-8">
        <span className="font-serif italic text-[13px] text-[var(--ink-3)]">
          Welcome back, {user.email ?? 'friend'}.
        </span>
      </footer>
    </main>
  )
}
