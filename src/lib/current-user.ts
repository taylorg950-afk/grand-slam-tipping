import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/** Header the proxy writes the verified user id into. */
export const VERIFIED_USER_HEADER = 'x-tp-user-id'

/**
 * The signed-in user's id, without paying for a second round trip.
 *
 * `supabase.auth.getUser()` verifies the token against the auth server, which
 * is a network call — and the proxy has already made exactly that call on this
 * same request to decide whether to allow it through. Asking again costs
 * another 300ms to 1.3s for an answer we already have, on every page.
 *
 * The proxy writes the verified id into a request header, and this reads it
 * back. A header sent by the client cannot reach here: the proxy runs on every
 * matched route and always either sets this header or strips it, so whatever
 * arrives from outside is replaced before a page ever sees it.
 *
 * Falls back to asking properly if the header is missing, so a route the proxy
 * does not match still behaves correctly rather than appearing signed out.
 */
export async function currentUserId(): Promise<string | null> {
  const fromProxy = (await headers()).get(VERIFIED_USER_HEADER)
  if (fromProxy) return fromProxy

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
