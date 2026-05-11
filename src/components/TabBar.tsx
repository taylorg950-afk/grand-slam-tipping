'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  tournamentSlug?: string
}

export function TabBar({ tournamentSlug }: Props) {
  const pathname = usePathname()

  const tabs = [
    { label: 'Today', href: '/dashboard' },
    { label: 'Picks', href: tournamentSlug ? `/tournaments/${tournamentSlug}/picks` : null },
    { label: 'Bracket', href: tournamentSlug ? `/tournaments/${tournamentSlug}/bracket` : null },
    { label: 'Standings', href: tournamentSlug ? `/tournaments/${tournamentSlug}/leaderboard` : null },
    { label: 'Final', href: tournamentSlug ? `/tournaments/${tournamentSlug}/tiebreaker` : null },
  ]

  return (
    <nav className="sticky bottom-0 z-20 bg-[#FAF6EC] border-t border-[#1B181420]
                    px-8 pt-3 flex items-center justify-between"
         style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      {tabs.map((t) => {
        if (!t.href) return (
          <span key={t.label} className="text-[10px] uppercase tracking-[0.18em] text-[#1B181430] pb-1 border-b-2 border-transparent">
            {t.label}
          </span>
        )
        const active = pathname === t.href || (t.href !== '/dashboard' && pathname.startsWith(t.href))
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`text-[10px] uppercase tracking-[0.18em] pb-1 border-b-2 transition-colors
                       ${active
                         ? 'text-[#1B1814] font-semibold border-[#B85433]'
                         : 'text-[#3C342C] font-normal border-transparent'}`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
