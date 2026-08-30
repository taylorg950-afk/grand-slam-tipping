import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect all routes except login, signup, and auth callback. The icon,
  // manifest and OG image must stay public too — the crawler that renders a
  // link preview and the browser that fetches a home-screen icon are never
  // signed in, so redirecting them to /login yields a blank preview.
  const isPublicAsset =
    pathname === '/icon' ||
    pathname === '/apple-icon' ||
    pathname === '/opengraph-image' ||
    pathname === '/manifest.webmanifest'
  const isPublicPath =
    pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth/') || isPublicAsset
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from login and signup pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
