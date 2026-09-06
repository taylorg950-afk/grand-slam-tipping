// Reads finished singles results out of a Wikipedia draw article.
//
// The draw articles are wikitext built from bracket templates. Each half of the
// draw is split into eight "Section" blocks holding a 16-team bracket, and the
// last eight players sit in a separate finals bracket at the top of the page.
//
// Two things about this source are easy to get wrong and both have bitten us:
//
//  1. Wikipedia bolds the winner's name. A match that is still being played
//     already has games filled in but nothing bolded yet. Reading those scores
//     as a result records a live match as finished, on a partial scoreline,
//     with the winner guessed from field order. Nothing here treats a match as
//     finished unless exactly one side is bold.
//
//  2. A tiebreak is written as 7<sup>7</sup>-6<sup>5</sup>, and the superscript
//     that matters is the one on the side that LOST that set. Taking the
//     winner's instead reads plausibly and is silently wrong.

export type BracketRound = 'R128' | 'R64' | 'R32' | 'R16' | 'QF' | 'SF' | 'F'

export interface ParsedResult {
  round: BracketRound
  /** Bracket position within the round, zero-based. */
  position: number
  winner: string
  loser: string
  /** Winner's side of the scoreline; 'w/o' when the match was not played. */
  score: string
}

export interface ParseReport {
  results: ParsedResult[]
  /** Matches with games on the page but no winner marked — still in play. */
  inProgress: string[]
}

const strip = (v: string) =>
  v.replace(/\{\{flagicon\|[A-Z]{3}\}\}/g, '').replace(/'''/g, '').trim()

const displayName = (v: string) => {
  const cleaned = strip(v)
  const link = cleaned.match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/)
  // Wikipedia disambiguates some players by title, e.g. "Tommy Paul (tennis)".
  return (link ? link[1] : cleaned).replace(/\s*\([^)]*\)\s*$/, '').trim()
}

const gamesIn = (s: string) => Number((s.replace(/'''/g, '').match(/^\s*(\d+)/) ?? [])[1])
const supIn = (s: string) => s.match(/<sup>(\d+)<\/sup>/)?.[1] ?? null

/** One set, from the match winner's side, with the tiebreak loser's points. */
function setScore(winnerSide: string, loserSide: string): string | null {
  const wg = gamesIn(winnerSide)
  const lg = gamesIn(loserSide)
  if (!Number.isFinite(wg) || !Number.isFinite(lg)) return null
  const tb = wg > lg ? supIn(loserSide) : supIn(winnerSide)
  return `${wg}-${lg}${tb ? `(${tb})` : ''}`
}

/** Reads `|RD2-team03=…` style fields out of one bracket template. */
function fields(body: string, rd: string) {
  const re = new RegExp(`\\|\\s*(${rd}-(?:team|score)\\d{1,2}(?:-\\d)?)\\s*=([^\\n]*)`, 'g')
  return Object.fromEntries([...body.matchAll(re)].map(m => [m[1], m[2]]))
}

interface Layout {
  rd: string
  round: BracketRound
  /** Team suffixes are zero-padded inside the section brackets, bare in the final. */
  pad: boolean
  /** Number of matches this template holds for the round. */
  count: number
}

function readTemplate(
  body: string,
  layout: Layout,
  positionOf: (index: number) => number,
  report: ParseReport,
) {
  const f = fields(body, layout.rd)
  const key = (n: number) => (layout.pad ? String(n).padStart(2, '0') : String(n))

  for (let i = 0; i < layout.count; i++) {
    const a = 2 * i + 1
    const b = 2 * i + 2
    const teamA = f[`${layout.rd}-team${key(a)}`] ?? ''
    const teamB = f[`${layout.rd}-team${key(b)}`] ?? ''
    if (!teamA.trim() || !teamB.trim()) continue

    const scoresA = [1, 2, 3, 4, 5].map(k => f[`${layout.rd}-score${key(a)}-${k}`] ?? '')
    const scoresB = [1, 2, 3, 4, 5].map(k => f[`${layout.rd}-score${key(b)}-${k}`] ?? '')

    const aBold = teamA.includes("'''")
    const bBold = teamB.includes("'''")
    const anyScore = [...scoresA, ...scoresB].some(s => s.trim())

    // Neither bold, or somehow both: not a decided match.
    if (aBold === bBold) {
      if (anyScore) {
        report.inProgress.push(
          `${layout.round} #${positionOf(i)}: ${displayName(teamA)} v ${displayName(teamB)}`
        )
      }
      continue
    }

    const [winRaw, loseRaw] = aBold ? [teamA, teamB] : [teamB, teamA]
    const [winSets, loseSets] = aBold ? [scoresA, scoresB] : [scoresB, scoresA]
    const sets = winSets
      .map((s, k) => (s.trim() || loseSets[k].trim() ? setScore(s, loseSets[k]) : null))
      .filter((s): s is string => s !== null)

    report.results.push({
      round: layout.round,
      position: positionOf(i),
      winner: displayName(winRaw),
      loser: displayName(loseRaw),
      // A bolded winner with no games at all is a walkover.
      score: sets.length ? sets.join(' ') : 'w/o',
    })
  }
}

/** Which round each RD field maps to inside a 16-team section bracket. */
const SECTION_LAYOUT: Layout[] = [
  { rd: 'RD1', round: 'R128', pad: true, count: 8 },
  { rd: 'RD2', round: 'R64', pad: true, count: 4 },
  { rd: 'RD3', round: 'R32', pad: true, count: 2 },
  { rd: 'RD4', round: 'R16', pad: true, count: 1 },
]

/** The finals bracket at the top of the article holds the last eight. */
const FINALS_LAYOUT: Layout[] = [
  { rd: 'RD1', round: 'QF', pad: false, count: 4 },
  { rd: 'RD2', round: 'SF', pad: false, count: 2 },
  { rd: 'RD3', round: 'F', pad: false, count: 1 },
]

export function parseDraw(wikitext: string): ParseReport {
  const report: ParseReport = { results: [], inProgress: [] }

  // Sections are numbered 1–8 across both halves of the draw, so a section's
  // number alone fixes where its matches sit in each round.
  const parts = wikitext.split(/={3,4}\s*Section\s*(\d)\s*={3,4}/)
  for (let i = 1; i < parts.length; i += 2) {
    const section = Number(parts[i])
    const body = parts[i + 1]
    for (const layout of SECTION_LAYOUT) {
      readTemplate(body, layout, idx => layout.count * (section - 1) + idx, report)
    }
  }

  // Everything before the first section heading contains the finals bracket.
  const head = parts[0]
  if (/8TeamBracket/.test(head)) {
    for (const layout of FINALS_LAYOUT) {
      readTemplate(head, layout, idx => idx, report)
    }
  }

  return report
}

/**
 * Turns a Wikipedia article URL into its raw wikitext.
 *
 * Only en.wikipedia.org is accepted — this runs server-side with an admin's
 * privileges, so the host is pinned rather than taken from whatever was pasted.
 */
export async function fetchDrawWikitext(url: string): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('That is not a valid URL.')
  }
  if (parsed.hostname !== 'en.wikipedia.org') {
    throw new Error('Only en.wikipedia.org draw pages are supported.')
  }
  const title = parsed.pathname.replace(/^\/wiki\//, '')
  if (!title) throw new Error('That URL does not point at an article.')

  const res = await fetch(
    `https://en.wikipedia.org/wiki/${title}?action=raw`,
    { headers: { 'User-Agent': 'TheTippingPost/1.0 (private tipping competition)' }, cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}.`)
  const text = await res.text()
  if (!/TeamBracket/.test(text)) {
    throw new Error('That page has no draw bracket on it.')
  }
  return text
}
