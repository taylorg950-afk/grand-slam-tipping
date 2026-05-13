'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const prevPathname = useRef(pathname)

  // When pathname changes, navigation is complete
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      setState('done')
      const t = setTimeout(() => setState('idle'), 400)
      return () => clearTimeout(t)
    }
  }, [pathname])

  // Detect internal link clicks to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      // Skip external links, anchors, mailto, same-page
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return
      if (href === pathname || href === window.location.pathname) return
      setState('loading')
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  if (state === 'idle') return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-[2px]"
      style={{ background: 'transparent' }}
    >
      <div
        style={{
          height: '100%',
          background: '#B85433',
          animation: state === 'loading'
            ? 'nav-progress 8s ease-out forwards'
            : 'nav-progress-done 350ms ease-out forwards',
        }}
      />
    </div>
  )
}
