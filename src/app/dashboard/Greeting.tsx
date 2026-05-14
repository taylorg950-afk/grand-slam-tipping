'use client'

import { useMemo } from 'react'

export function Greeting({ firstName, editorLine }: { firstName: string; editorLine: string }) {
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
  }, [])

  return (
    <p className="font-serif text-[22px] leading-[1.15] tracking-tight">
      {greeting}, {firstName}.{' '}
      <span className="italic text-[#3C342C]">{editorLine}</span>
    </p>
  )
}
