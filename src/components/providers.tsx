'use client'

import { useEffect } from 'react'
import { NavigationProgress } from './NavigationProgress'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // iOS Safari only fires :active if an ancestor has a touch listener
    const noop = () => {}
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])

  return (
    <>
      <NavigationProgress />
      {children}
    </>
  )
}
