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
  ]

  return (
    <nav className="sticky bottom-0 z-20 bg-[var(--paper)] border-t border-[#15231B20]
                    px-8 pt-3 flex items-center justify-between"
         style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      {tabs.map((t) => {
        if (!t.href) return (
          <span key={t.label} className="text-[10px] uppercase tracking-[0.18em] text-[#15231B30] pb-1 border-b-2 border-transparent">
            {t.label}
          </span>
        )
        const active = pathname === t.href || (t.href !== '/dashboard' && pathname.startsWith(t.href))
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`text-[10px] uppercase tracking-[0.18em] pb-1 border-b-2 transition-colors hover:font-semibold hover:text-[var(--ink)]
                       ${active
                         ? 'text-[var(--ink)] font-semibold border-[var(--brick)]'
                         : 'text-[var(--ink-2)] font-normal border-transparent'}`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
