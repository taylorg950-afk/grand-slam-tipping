// Removes everything seed-practice-us-open.mjs created: the practice
// tournament (cascades rounds/matches/tips/tiebreakers) and the fake users.
//
//   node scripts/cleanup-practice-us-open.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const SLUG = 'us-open-practice'
const FAKE_NAMES = ['Demo Dana', 'Practice Pete', 'Testy McTipface', 'Rookie Riley']

function env() {
  const out = {}
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

async function main() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env()
  const db = createClient(url, key, { auth: { persistSession: false } })

  const { data: t } = await db.from('tournaments').select('id').eq('slug', SLUG).maybeSingle()
  if (t) {
    const { error } = await db.from('tournaments').delete().eq('id', t.id)
    if (error) throw new Error(error.message)
    console.log('Deleted practice tournament (and its rounds/matches/tips).')
  } else {
    console.log('No practice tournament found.')
  }

  const { data: users } = await db.from('users').select('id, display_name').in('display_name', FAKE_NAMES)
  for (const u of users ?? []) {
    const { error } = await db.auth.admin.deleteUser(u.id)
    if (error) throw new Error(`${u.display_name}: ${error.message}`)
    console.log(`Deleted fake user ${u.display_name}.`)
  }

  console.log('Clean.')
}

main().catch(e => { console.error(e); process.exit(1) })
