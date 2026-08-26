'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  tournamentSlug?: string
}

export function TabBar({ tournamentSlug }: Props) {
  const pathname = usePathname()

  const tabs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Picks', href: tournamentSlug ? `/tournaments/${tournamentSlug}/picks` : null },
    { label: 'Bracket', href: tournamentSlug ? `/tournaments/${tournamentSlug}/bracket` : null },
    { label: 'Standings', href: tournamentSlug ? `/tournaments/${tournamentSlug}/leaderboard` : null },
    { label: 'Final', href: tournamentSlug ? `/tournaments/${tournamentSlug}/tiebreaker` : null },
    { label: 'Rules', href: '/rules' },
  ]

  return (
    <nav className="sticky bottom-0 z-20 flex items-center justify-between gap-2 border-t border-[var(--rule)] bg-[var(--paper-2)] px-4 pt-3.5 md:px-8"
         style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {tabs.map((t) => {
        if (!t.href) return (
          <span key={t.label} className="border-b-2 border-transparent pb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {t.label}
          </span>
        )
        const active = pathname === t.href || (t.href !== '/dashboard' && pathname.startsWith(t.href))
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`border-b-2 pb-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-[var(--ink)]
                       ${active
                         ? 'border-[var(--brick)] font-bold text-[var(--ink)]'
                         : 'border-transparent font-medium text-[var(--ink-2)]'}`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
