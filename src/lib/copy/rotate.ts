// Picks one of several wordings, fixed for the day.
//
// The dashboard copy is generated from the state of the comp, so on a quiet
// day between results it would otherwise read word for word the same as it did
// yesterday. Rotating the phrasing keeps it alive without inventing anything:
// only the wording moves, never the numbers behind it.

/** Stable 0..1 hash, so a given day and slot resolve to the same wording all day. */
function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/**
 * Steps one variant per day rather than hashing the day straight to a choice.
 * Hashing picks the same wording on consecutive days often enough to look
 * broken — with three variants it repeats about a third of the time — and the
 * whole point is that it reads differently each morning. Stepping guarantees
 * that.
 *
 * `salt` only sets each slot's starting offset, so two lines in the same block
 * do not move in lockstep. Keyed to an AEST day key, so the copy turns over at
 * local midnight rather than mid-afternoon.
 */
export function pickForDay<T>(dayKey: string, salt: string, variants: readonly T[]): T {
  if (variants.length <= 1) return variants[0]
  const dayIndex = Math.floor(Date.parse(dayKey) / 86_400_000)
  const offset = Math.floor(hash01(salt) * variants.length)
  return variants[(dayIndex + offset) % variants.length]
}
