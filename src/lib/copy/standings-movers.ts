// Deterministic narrative templates for the Standings "Movers" panel.
// See design-handoff/COPY-PATTERNS.md → "Standings movers".
//
// v1 scope: implements the data-derivable narratives (three in a row,
// sharper than the room, round of zeroes, holding pattern, same as the
// rest). Seed-aware narratives ("Got the dark horse", "Punted the chalk")
// are deferred until match seeds are first-class in the schema.

export interface MoverSignals {
  consecutiveCorrectInLatestRound: number
  thisRoundAccuracy: number | null
  roomAvgAccuracy: number | null
  zeroLatestRound: boolean
  latestRoundName: string | null
  pickedAllConsensus: boolean
  stuckRounds: number
}

export function gainerNarrative(s: MoverSignals): string {
  if (s.latestRoundName && s.consecutiveCorrectInLatestRound >= 3) {
    return `Three ${s.latestRoundName} calls landed back-to-back.`
  }
  if (
    s.latestRoundName &&
    s.thisRoundAccuracy != null &&
    s.roomAvgAccuracy != null &&
    s.thisRoundAccuracy > s.roomAvgAccuracy + 20
  ) {
    return `Converted ${s.thisRoundAccuracy}% in ${s.latestRoundName} vs room avg ${s.roomAvgAccuracy}%.`
  }
  return '—'
}

export function fallerNarrative(s: MoverSignals): string {
  if (s.zeroLatestRound && s.latestRoundName) {
    return `Zero from ${s.latestRoundName}.`
  }
  if (s.latestRoundName && s.thisRoundAccuracy != null && s.roomAvgAccuracy != null && s.thisRoundAccuracy < s.roomAvgAccuracy - 15) {
    return `Field caught up while their ${s.latestRoundName} stalled.`
  }
  return '—'
}

export function stuckNarrative(s: MoverSignals): string {
  if (s.pickedAllConsensus) return 'Picked the favourites; got the favourites.'
  if (s.stuckRounds >= 2) return 'Even with the room — neither pulling away nor falling back.'
  return '—'
}

export function pluralSpots(n: number): string {
  return Math.abs(n) === 1 ? 'spot' : 'spots'
}

export function pluralRounds(n: number): string {
  return Math.abs(n) === 1 ? 'round' : 'rounds'
}
