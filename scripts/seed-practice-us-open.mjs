// Seeds a practice "US Open 2026" tournament with fake users, three resulted
// rounds (R16/QF/SF incl. one walkover), and open finals — so the admin can
// preview every page state. Re-runnable: wipes any previous practice data first.
//
//   node scripts/seed-practice-us-open.mjs
//
// Remove everything again with: node scripts/cleanup-practice-us-open.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const SLUG = 'us-open-practice'
const FAKE_USERS = [
  { email: 'demo-dana@example.com', name: 'Demo Dana', catchphrase: 'Never met a favourite I didn’t like.', hit: 0.8, skip: 0 },
  { email: 'practice-pete@example.com', name: 'Practice Pete', catchphrase: 'Gut feel over form guide.', hit: 0.6, skip: 0 },
  { email: 'testy-mctipface@example.com', name: 'Testy McTipface', catchphrase: 'Chaos is a ladder.', hit: 0.45, skip: 0.1 },
  { email: 'rookie-riley@example.com', name: 'Rookie Riley', catchphrase: 'Still learning the rules tbh.', hit: 0.35, skip: 0.25 },
]
const TAY_HIT = 0.65

function env() {
  const out = {}
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

// Deterministic RNG so reruns produce the same standings.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260718)

// d: date string, w: 'player1'|'player2'|null, s: score, wo: walkover (no points)
const MENS = {
  R16: [
    { p1: 'Jannik Sinner [1]', p2: 'Tommy Paul [13]', w: 'player1', s: '6-4 6-2 7-6(4)', d: '2026-07-14T00:00:00Z' },
    { p1: 'Ben Shelton [10]', p2: 'Alex de Minaur [8]', w: 'player2', s: '7-6(5) 6-4 4-6 6-3', d: '2026-07-14T01:30:00Z' },
    { p1: 'Novak Djokovic [4]', p2: 'Frances Tiafoe [16]', w: 'player1', s: '6-3 6-4 6-4', d: '2026-07-14T03:00:00Z' },
    { p1: 'Jack Draper [5]', p2: 'Holger Rune [12]', w: 'player1', s: '6-4 3-6 6-3 6-2', d: '2026-07-14T04:30:00Z' },
    { p1: 'Taylor Fritz [6]', p2: 'Daniil Medvedev [11]', w: 'player1', s: '7-5 6-4 6-4', d: '2026-07-14T06:00:00Z' },
    { p1: 'Lorenzo Musetti [7]', p2: 'Casper Ruud [9]', w: 'player1', s: '4-6 6-3 7-6(2) 6-4', d: '2026-07-14T07:30:00Z' },
    { p1: 'Andrey Rublev [14]', p2: 'Felix Auger-Aliassime', w: 'player1', s: '6-4 6-4 3-6 7-5', d: '2026-07-14T09:00:00Z' },
    { p1: 'Carlos Alcaraz [2]', p2: 'Arthur Fils [15]', w: 'player1', s: '6-2 6-3 6-2', d: '2026-07-14T10:30:00Z' },
  ],
  QF: [
    { p1: 'Jannik Sinner [1]', p2: 'Alex de Minaur [8]', w: 'player1', s: '6-3 6-4 6-2', d: '2026-07-15T01:00:00Z' },
    { p1: 'Novak Djokovic [4]', p2: 'Jack Draper [5]', w: 'player2', s: 'w/o', wo: true, d: '2026-07-15T03:00:00Z' },
    { p1: 'Taylor Fritz [6]', p2: 'Lorenzo Musetti [7]', w: 'player1', s: '7-6(3) 6-4 6-7(5) 6-3', d: '2026-07-15T05:00:00Z' },
    { p1: 'Andrey Rublev [14]', p2: 'Carlos Alcaraz [2]', w: 'player2', s: '6-3 6-2 6-4', d: '2026-07-15T07:00:00Z' },
  ],
  SF: [
    { p1: 'Jannik Sinner [1]', p2: 'Jack Draper [5]', w: 'player1', s: '7-6(6) 6-4 6-4', d: '2026-07-16T02:00:00Z' },
    { p1: 'Taylor Fritz [6]', p2: 'Carlos Alcaraz [2]', w: 'player2', s: '6-4 6-7(4) 6-3 6-2', d: '2026-07-16T06:00:00Z' },
  ],
  F: [
    { p1: 'Jannik Sinner [1]', p2: 'Carlos Alcaraz [2]', w: null, s: null, d: '2026-07-20T06:00:00Z' },
  ],
}

const WOMENS = {
  R16: [
    { p1: 'Aryna Sabalenka [1]', p2: 'Donna Vekic [15]', w: 'player1', s: '6-3 6-4', d: '2026-07-14T00:30:00Z' },
    { p1: 'Madison Keys [6]', p2: 'Emma Navarro [10]', w: 'player1', s: '7-5 6-4', d: '2026-07-14T02:00:00Z' },
    { p1: 'Coco Gauff [3]', p2: 'Naomi Osaka [12]', w: 'player1', s: '6-4 3-6 6-3', d: '2026-07-14T03:30:00Z' },
    { p1: 'Mirra Andreeva [7]', p2: 'Emma Raducanu [11]', w: 'player1', s: '6-2 7-5', d: '2026-07-14T05:00:00Z' },
    { p1: 'Jessica Pegula [5]', p2: 'Karolina Muchova [14]', w: 'player1', s: '6-3 7-6(4)', d: '2026-07-14T06:30:00Z' },
    { p1: 'Zheng Qinwen [8]', p2: 'Barbora Krejcikova [13]', w: 'player1', s: '6-4 6-4', d: '2026-07-14T08:00:00Z' },
    { p1: 'Jasmine Paolini [4]', p2: 'Amanda Anisimova [9]', w: 'player2', s: '7-6(2) 6-3', d: '2026-07-14T09:30:00Z' },
    { p1: 'Iga Swiatek [2]', p2: 'Paula Badosa [16]', w: 'player1', s: '6-1 6-3', d: '2026-07-14T11:00:00Z' },
  ],
  QF: [
    { p1: 'Aryna Sabalenka [1]', p2: 'Madison Keys [6]', w: 'player1', s: '6-4 7-5', d: '2026-07-15T02:00:00Z' },
    { p1: 'Coco Gauff [3]', p2: 'Mirra Andreeva [7]', w: 'player2', s: '6-4 4-6 7-6(5)', d: '2026-07-15T04:00:00Z' },
    { p1: 'Jessica Pegula [5]', p2: 'Zheng Qinwen [8]', w: 'player1', s: '6-3 4-6 6-4', d: '2026-07-15T06:00:00Z' },
    { p1: 'Amanda Anisimova [9]', p2: 'Iga Swiatek [2]', w: 'player2', s: '6-2 6-4', d: '2026-07-15T08:00:00Z' },
  ],
  SF: [
    { p1: 'Aryna Sabalenka [1]', p2: 'Mirra Andreeva [7]', w: 'player1', s: '6-3 6-4', d: '2026-07-16T03:00:00Z' },
    { p1: 'Jessica Pegula [5]', p2: 'Iga Swiatek [2]', w: 'player2', s: '6-4 6-2', d: '2026-07-16T07:00:00Z' },
  ],
  F: [
    { p1: 'Aryna Sabalenka [1]', p2: 'Iga Swiatek [2]', w: null, s: null, d: '2026-07-19T20:00:00Z' },
  ],
}

const ROUNDS = [
  { name: 'R16', pts: 8, sort: 0 },
  { name: 'QF', pts: 16, sort: 1 },
  { name: 'SF', pts: 32, sort: 2 },
  { name: 'F', pts: 64, sort: 3 },
]

async function main() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env()
  const db = createClient(url, key, { auth: { persistSession: false } })

  // ── Wipe any previous practice run ────────────────────────────────
  const { data: existing } = await db.from('tournaments').select('id').eq('slug', SLUG).maybeSingle()
  if (existing) {
    await db.from('tournaments').delete().eq('id', existing.id) // cascades rounds → matches → tips
    console.log('Removed previous practice tournament.')
  }
  const { data: oldUsers } = await db.from('users').select('id, display_name')
    .in('display_name', FAKE_USERS.map(u => u.name))
  for (const u of oldUsers ?? []) {
    await db.auth.admin.deleteUser(u.id)
    console.log(`Removed previous fake user ${u.display_name}.`)
  }

  // ── Fake users ────────────────────────────────────────────────────
  const fakeIds = {}
  for (const u of FAKE_USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      email_confirm: true,
      user_metadata: { display_name: u.name },
    })
    if (error) throw new Error(`createUser ${u.name}: ${error.message}`)
    fakeIds[u.name] = data.user.id
    await db.from('users').update({ catchphrase: u.catchphrase }).eq('id', data.user.id)
    console.log(`Created ${u.name}`)
  }

  const { data: tay } = await db.from('users').select('id').eq('is_admin', true).single()

  // ── Tournament + rounds ───────────────────────────────────────────
  const { data: tournament, error: tErr } = await db.from('tournaments').insert({
    name: 'US Open 2026 (Practice)',
    slug: SLUG,
    start_date: '2026-07-13',
    end_date: '2026-07-21',
    is_active: false, // flip manually if you want it on everyone's dashboard
  }).select('id').single()
  if (tErr) throw new Error(tErr.message)

  const roundIds = {}
  for (const r of ROUNDS) {
    const { data, error } = await db.from('rounds').insert({
      tournament_id: tournament.id,
      name: r.name,
      points_per_correct_tip: r.pts,
      sort_order: r.sort,
    }).select('id').single()
    if (error) throw new Error(error.message)
    roundIds[r.name] = data.id
  }
  console.log('Created tournament + rounds.')

  // ── Matches ───────────────────────────────────────────────────────
  const matches = [] // { id, winner, no_points, roundName }
  for (const [draw, data] of [['mens', MENS], ['womens', WOMENS]]) {
    for (const r of ROUNDS) {
      for (const [pos, m] of data[r.name].entries()) {
        const { data: row, error } = await db.from('matches').insert({
          round_id: roundIds[r.name],
          player1_name: m.p1,
          player2_name: m.p2,
          scheduled_start: m.d,
          winner: m.w,
          score: m.s,
          no_points: !!m.wo,
          draw,
          bracket_position: pos,
        }).select('id').single()
        if (error) throw new Error(error.message)
        matches.push({ id: row.id, winner: m.w, no_points: !!m.wo, roundName: r.name })
      }
    }
  }
  console.log(`Created ${matches.length} matches.`)

  // ── Tips — biased towards the actual winner per tipper "skill" ────
  const tippers = [
    ...FAKE_USERS.map(u => ({ id: fakeIds[u.name], hit: u.hit, skip: u.skip, finals: true })),
    // Tay gets tips on everything except the finals — left open to practice on.
    { id: tay.id, hit: TAY_HIT, skip: 0, finals: false },
  ]
  const tips = []
  for (const m of matches) {
    for (const t of tippers) {
      if (m.roundName === 'F' && !t.finals) continue
      if (t.skip && rand() < t.skip) continue
      let pick
      if (m.winner) pick = rand() < t.hit ? m.winner : (m.winner === 'player1' ? 'player2' : 'player1')
      else pick = rand() < 0.5 ? 'player1' : 'player2'
      tips.push({ user_id: t.id, match_id: m.id, predicted_winner: pick })
    }
  }
  const { error: tipErr } = await db.from('tips').insert(tips)
  if (tipErr) throw new Error(tipErr.message)
  console.log(`Created ${tips.length} tips.`)

  // ── Tiebreakers for the fakes ─────────────────────────────────────
  await db.from('tiebreakers').insert([
    { user_id: fakeIds['Demo Dana'], tournament_id: tournament.id, mens_final_total_games: 38, womens_final_total_games: 21 },
    { user_id: fakeIds['Practice Pete'], tournament_id: tournament.id, mens_final_total_games: 41, womens_final_total_games: 23 },
    { user_id: fakeIds['Testy McTipface'], tournament_id: tournament.id, mens_final_total_games: 29, womens_final_total_games: 18 },
  ])
  console.log('Created tiebreakers.')

  console.log(`\nDone. Browse it at /tournaments/${SLUG}/bracket (leaderboard, picks, rounds all live).`)
}

main().catch(e => { console.error(e); process.exit(1) })
