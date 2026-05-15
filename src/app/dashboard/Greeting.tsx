'use client'

import { useState, useEffect } from 'react'

export function Greeting({ firstName, editorLine }: { firstName: string; editorLine: string }) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening')
  }, [])

  return (
    <p className="font-serif text-[22px] leading-[1.15] tracking-tight">
      {greeting ? `${greeting}, ${firstName}. ` : ''}
      <span className="italic text-[#3C342C]">{editorLine}</span>
    </p>
  )
}
