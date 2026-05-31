// All user-facing times on the site are displayed in AEST.
// "AEST" here means a fixed UTC+10 with no daylight saving, so we use
// Australia/Brisbane (which never observes DST) rather than Sydney/Melbourne.
export const AEST_TZ = 'Australia/Brisbane'
export const AEST_LABEL = 'AEST'

// True calendar day in AEST, e.g. "2026-05-31" — for same-day / today comparisons
// that must not depend on the viewer's (or the server's) local timezone.
export function aestDayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: AEST_TZ }) // en-CA gives YYYY-MM-DD
}
