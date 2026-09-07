// Per-person copy preferences.
//
// The dashboard picks its wording from where you actually sit in the standings.
// This lets one person override that for their own dashboard and nobody else's
// — a taste thing, not a feature. Remove an entry and that person goes back to
// whatever their position would normally give them.
//
// A pin only changes which set of wordings is used. Every number, name and
// privacy rule still comes from the real state, so a pinned dashboard is not a
// lying one.

/** The wording sets a person can pin themselves to. */
export type CopyTone = 'chaser'

const PINS: Record<string, CopyTone> = {
  // Tay — prefers the chaser copy, which is the one that calls the leader smug.
  'e64c06da-ae33-4e2d-b2de-545f73f22509': 'chaser',
}

export function copyToneFor(userId: string | null | undefined): CopyTone | undefined {
  return userId ? PINS[userId] : undefined
}
