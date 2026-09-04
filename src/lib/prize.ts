// The money side of the comp. Nothing here is stored in the database — it lives
// in one place so it can be changed without hunting through pages.

/** What each player puts in, in whole dollars. */
export const BUY_IN = 30

/** Share of the pool by finishing position: 1st, 2nd, 3rd. */
export const SPLIT = [0.5, 0.3, 0.2] as const

export const PLACE_LABELS = ['1st', '2nd', '3rd'] as const

export interface Prizes {
  players: number
  pool: number
  /** Whole-dollar payouts, same order as SPLIT. Always sums exactly to pool. */
  payouts: number[]
}

/**
 * Splits the pool into whole dollars. Rounding leftovers go to first place, so
 * the parts always add up to the pool rather than being a dollar or two short.
 */
export function prizes(players: number): Prizes {
  const pool = players * BUY_IN
  const rest = SPLIT.slice(1).map(s => Math.round(pool * s))
  const first = pool - rest.reduce((a, b) => a + b, 0)
  return { players, pool, payouts: [first, ...rest] }
}

export function money(n: number) {
  return `$${n.toLocaleString('en-AU')}`
}
