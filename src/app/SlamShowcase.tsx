'use client'

import { Anton, Playfair_Display, Libre_Baskerville, Saira_Condensed } from 'next/font/google'

// Per-slam display faces — each major set in the type that suits it.
const aoFont = Anton({ subsets: ['latin'], weight: '400' })                      // Australian Open — bold, modern
const rgFont = Playfair_Display({ subsets: ['latin'], weight: ['700', '900'] })  // Roland-Garros — elegant French serif
const wFont = Libre_Baskerville({ subsets: ['latin'], weight: ['700'] })         // Wimbledon — traditional English serif
export const usFont = Saira_Condensed({ subsets: ['latin'], weight: ['600', '700'] }) // US Open — condensed grotesque

interface Slam {
  key: string
  mono: string
  name: string
  loc: string
  surface: string
  month: string
  grad: string
  monoColor: string
  pillBg: string
  pillText: string
  font: string
  /* Fits the name to the column: a share of the column's width, capped so it
     never outgrows the design size. Tuned per face — they differ a lot in width. */
  nameSize: string
}

const SLAMS: Slam[] = [
  {
    key: 'ao', mono: 'AO', name: 'Australian Open', loc: 'Melbourne Park', surface: 'Hard court', month: 'January',
    grad: 'linear-gradient(180deg,#4E86BE 0%,#2B6199 100%)', monoColor: '#C6E2FF', pillBg: 'rgba(11,20,55,0.35)', pillText: '#DCE8FF', font: aoFont.className, nameSize: 'min(21cqw, 17px)',
  },
  {
    key: 'rg', mono: 'RG', name: 'Roland-Garros', loc: 'Stade R.-Garros, Paris', surface: 'Clay', month: 'May',
    grad: 'linear-gradient(180deg,#C15A2C 0%,#98421D 100%)', monoColor: '#F1CDA6', pillBg: 'rgba(40,18,8,0.4)', pillText: '#F4D9BE', font: rgFont.className, nameSize: 'min(19.5cqw, 16px)',
  },
  {
    key: 'w', mono: 'W', name: 'Wimbledon', loc: 'All England Club, London', surface: 'Grass', month: 'July',
    grad: 'linear-gradient(180deg,#2E6B3E 0%,#173B23 100%)', monoColor: '#CBB6E6', pillBg: 'rgba(10,30,18,0.45)', pillText: '#DBE8DF', font: wFont.className, nameSize: 'min(11.6cqw, 12.5px)',
  },
  {
    key: 'us', mono: 'US', name: 'US Open', loc: 'Flushing Meadows, NY', surface: 'Hard court', month: 'August',
    grad: 'linear-gradient(180deg,#2A4CA0 0%,#152C74 100%)', monoColor: '#E8EF6B', pillBg: 'var(--spark)', pillText: 'var(--spark-ink)', font: usFont.className, nameSize: 'min(30cqw, 17px)',
  },
]

export default function SlamShowcase() {
  return (
    <div className="login-aside relative flex-col" style={{ background: '#0B1437' }}>
      <div className="px-8 pb-6 pt-9 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#8DA0D8' }}>
          The Tipping Post · four majors
        </div>
        <h2 className={`${usFont.className} mt-3 text-[46px] font-bold leading-[0.95] tracking-[0.005em]`}>
          One post. <span style={{ color: 'var(--spark)' }}>Every slam.</span>
        </h2>
        <p className="mt-3 text-[14px] leading-[1.5]" style={{ color: '#C3CEEC', maxWidth: 440 }}>
          Tip every match of all four majors. Each slam runs as its own competition, in its own colours — a fresh table every major.
        </p>
      </div>
      <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
        {SLAMS.map(s => <SlamCol key={s.key} slam={s} />)}
      </div>
    </div>
  )
}

function SlamCol({ slam }: { slam: Slam }) {
  return (
    <div className="slam-col relative flex flex-col justify-between p-5 text-white" style={{ background: slam.grad }}>
      <div>
        <div className={`${slam.font} text-[38px] leading-none`} style={{ color: slam.monoColor }}>{slam.mono}</div>
        <div className={`${slam.font} mt-3 uppercase leading-[1.1]`} style={{ fontSize: slam.nameSize }}>{slam.name}</div>
        <div className="mt-1.5 text-[11px] leading-tight text-white/65">{slam.loc}</div>
      </div>
      <div className="my-5 text-white/55"><Court /></div>
      <div>
        <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ background: slam.pillBg, color: slam.pillText }}>
          {slam.surface}
        </span>
        <div className="mt-2.5 text-[12px] text-white/75">{slam.month}</div>
      </div>
    </div>
  )
}

function Court() {
  return (
    <svg viewBox="0 0 120 78" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-full max-w-[140px]" aria-hidden>
      <rect x="2" y="2" width="116" height="74" rx="2" />
      <line x1="2" y1="39" x2="118" y2="39" />
      <line x1="60" y1="2" x2="60" y2="76" />
      <rect x="22" y="15" width="76" height="48" />
      <line x1="22" y1="39" x2="98" y2="39" />
    </svg>
  )
}
