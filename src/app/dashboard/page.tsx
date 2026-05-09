import { createClient } from '@/lib/supabase/server'
import { computeScores } from '@/lib/scoring'
import { ThemeToggle } from '@/components/ThemeToggle'
import Link from 'next/link'

interface Round {
  id: string
  name: string
  points_per_correct_tip: number
  sort_order: number
}

interface Match {
  id: string
  round_id: string
  winner: string | null
  scheduled_start: string
  player1_name: string
  player2_name: string
}

interface Tip {
  user_id: string
  match_id: string
  predicted_winner: string
}

interface RoundBreakdown {
  round: Round
  points: number
  correct: number
  tipped: number
  resulted: number
  total: number
}

function computeRoundBreakdown(
  userId: string,
  rounds: Round[],
  matches: Match[],
  tips: Tip[]
): RoundBreakdown[] {
  return rounds.map(round => {
    const roundMatches = matches.filter(m => m.round_id === round.id)
    const resulted = roundMatches.filter(m => m.winner)
    const myTips = tips.filter(t => t.user_id === userId && roundMatches.some(m => m.id === t.match_id))
    const correct = myTips.filter(t => {
      const match = resulted.find(m => m.id === t.match_id)
      return match && t.predicted_winner === match.winner
    })
    return {
      round,
      points: correct.length * round.points_per_correct_tip,
      correct: correct.length,
      tipped: myTips.length,
      resulted: resulted.length,
      total: roundMatches.length,
    }
  })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLOURS = [
  { bg: '#e2e8f0', text: '#334155' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fee2e2', text: '#991b1b' },
  { bg: '#ccfbf1', text: '#115e59' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#ffedd5', text: '#9a3412' },
]

function avatarColour(name: string) {
  return AVATAR_COLOURS[name.charCodeAt(0) % AVATAR_COLOURS.length]
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: tournament }] = await Promise.all([
    supabase.from('users').select('display_name, is_admin').eq('id', user!.id).single(),
    supabase.from('tournaments').select('id, name, slug').eq('is_active', true).maybeSingle(),
  ])

  const firstName = profile?.display_name?.split(/[.\s@]/)[0] ?? 'there'

  let scores = null
  let myScore = null
  let myRank = null
  let roundBreakdown: RoundBreakdown[] = []
  let rounds: Round[] = []
  let matches: Match[] = []
  let tips: Tip[] = []
  let upcomingRound: Round | null = null
  let upcomingMatches: Match[] = []

  if (tournament) {
    const { data: roundData } = await supabase
      .from('rounds')
      .select('id, name, points_per_correct_tip, sort_order')
      .eq('tournament_id', tournament.id)
      .order('sort_order')

    rounds = roundData ?? []
    const roundIds = rounds.map(r => r.id)

    const { data: matchData } = await supabase
      .from('matches')
      .select('id, round_id, winner, scheduled_start, player1_name, player2_name')
      .in('round_id', roundIds)
      .order('scheduled_start')

    matches = matchData ?? []
    const matchIds = matches.map(m => m.id)

    const [{ data: tipData }, { data: users }] = await Promise.all([
      matchIds.length
        ? supabase.from('tips').select('user_id, match_id, predicted_winner').in('match_id', matchIds)
        : Promise.resolve({ data: [] as Tip[] }),
      supabase.from('users').select('id, display_name').order('display_name'),
    ])

    tips = tipData ?? []
    scores = computeScores(users ?? [], matches, rounds, tips)
    const myIndex = scores.findIndex(s => s.id === user!.id)
    if (myIndex !== -1) {
      myScore = scores[myIndex]
      myRank = myIndex + 1
    }

    roundBreakdown = computeRoundBreakdown(user!.id, rounds, matches, tips)

    // Find the first round with any unlocked matches
    const now = new Date()
    for (const round of [...rounds].sort((a, b) => a.sort_order - b.sort_order)) {
      const roundMatches = matches.filter(m => m.round_id === round.id)
      const unlocked = roundMatches.filter(m => new Date(m.scheduled_start) > now)
      if (unlocked.length > 0) {
        upcomingRound = round
        upcomingMatches = unlocked.sort((a, b) =>
          new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
        )
        break
      }
    }
  }

  const leaderPoints = scores?.[0]?.totalPoints ?? 0
  const pointsGap = myScore ? myScore.totalPoints - leaderPoints : null

  const now = new Date()
  const lockedCount = matches.filter(m => new Date(m.scheduled_start) <= now).length
  const totalMatchCount = matches.length

  // Which round is currently in progress?
  const inProgressRound = rounds.find(round => {
    const rm = matches.filter(m => m.round_id === round.id)
    return rm.some(m => new Date(m.scheduled_start) <= now) && rm.some(m => !m.winner)
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>

      {/* Header strip */}
      <header style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {tournament && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{tournament.name}</p>}
            <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>
              G&apos;day, {firstName}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {inProgressRound && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {inProgressRound.name} in progress
              </span>
            )}
            {profile?.is_admin && (
              <Link href="/admin" style={{ fontSize: 13, color: 'var(--rg-accent-text)' }}>Admin</Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {!tournament ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No active tournament.</p>
        ) : (
          <>
            {/* 4 metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                {
                  label: 'Your rank',
                  value: myRank ? `${myRank} / ${scores?.length}` : '—',
                  sub: myRank === 1 ? 'leading' : null,
                },
                {
                  label: 'Your points',
                  value: myScore?.totalPoints ?? 0,
                  sub: null,
                },
                {
                  label: 'Behind leader',
                  value: pointsGap === null ? '—' : pointsGap >= 0 ? 'Leading' : pointsGap,
                  sub: pointsGap !== null && pointsGap < 0 ? 'pts' : null,
                },
                {
                  label: 'Tips locked in',
                  value: `${lockedCount} / ${totalMatchCount}`,
                  sub: 'matches',
                },
              ].map(card => (
                <div
                  key={card.label}
                  style={{
                    background: 'var(--metric-bg)',
                    borderRadius: 6,
                    padding: '14px 16px',
                  }}
                >
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
                    {card.value}
                  </p>
                  {card.sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{card.sub}</p>}
                </div>
              ))}
            </div>

            {/* 2-column: leaderboard + rounds */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>

              {/* Leaderboard */}
              <div style={{ border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--card-bg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: 'var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Leaderboard</span>
                  <Link href={`/tournaments/${tournament.slug}/leaderboard`} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Full leaderboard
                  </Link>
                </div>
                {!scores?.length ? (
                  <p style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-muted)' }}>No scores yet.</p>
                ) : (
                  <div>
                    {scores.map((s, i) => {
                      const isMe = s.id === user!.id
                      const colour = avatarColour(s.display_name)
                      return (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 20px',
                            borderBottom: 'var(--border-subtle)',
                            background: isMe ? '#FEF2EC' : undefined,
                            ...(isMe ? { outline: '1px solid var(--rg-accent-border)', outlineOffset: -1 } : {}),
                          }}
                        >
                          <span style={{
                            fontSize: 13,
                            color: isMe ? 'var(--rg-accent-text)' : 'var(--text-muted)',
                            fontWeight: isMe ? 500 : 400,
                            width: 20,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {i + 1}
                          </span>
                          {/* Avatar */}
                          <div style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 500,
                            flexShrink: 0,
                            background: colour.bg,
                            color: colour.text,
                          }}>
                            {initials(s.display_name)}
                          </div>
                          <span style={{
                            flex: 1,
                            fontSize: 14,
                            color: 'var(--text-primary)',
                            fontWeight: isMe ? 500 : 400,
                          }}>
                            {s.display_name}
                            {isMe && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>(you)</span>}
                          </span>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {s.correctTips}/{s.totalTips}
                          </span>
                          <span style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            fontVariantNumeric: 'tabular-nums',
                            width: 36,
                            textAlign: 'right',
                          }}>
                            {s.totalPoints}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Your rounds */}
              <div style={{ border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--card-bg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: 'var(--border-subtle)' }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Your rounds</span>
                </div>
                {roundBreakdown.length === 0 ? (
                  <p style={{ padding: '16px 20px', fontSize: 14, color: 'var(--text-muted)' }}>No rounds yet.</p>
                ) : (
                  <div>
                    {roundBreakdown.map(({ round, points, correct, tipped, resulted, total }) => {
                      const barPct = resulted > 0 ? Math.round((correct / resulted) * 100) : 0
                      const hasResults = resulted > 0
                      const inProgress = resulted > 0 && resulted < total
                      const barColour = inProgress ? 'var(--rg-accent)' : 'var(--rg-green)'

                      return (
                        <div
                          key={round.id}
                          style={{
                            padding: '10px 20px 12px',
                            borderBottom: `1px solid var(--border-subtle)`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <Link
                                href={`/tournaments/${tournament.slug}/round/${round.name}`}
                                style={{ fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none' }}
                              >
                                {round.name}
                              </Link>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {round.points_per_correct_tip}pt
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                {hasResults ? `${correct}/${resulted}` : total > 0 ? `${tipped} tipped` : '—'}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'right' }}>
                                {hasResults ? points : '—'}
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                            {hasResults && (
                              <div style={{
                                height: '100%',
                                width: `${barPct}%`,
                                borderRadius: 2,
                                background: barColour,
                                transition: 'width 0.3s ease',
                              }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming round panel */}
            {upcomingRound && upcomingMatches.length > 0 && (
              <div style={{ border: '1px solid var(--border-default)', borderRadius: 8, background: 'var(--card-bg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: 'var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {upcomingRound.name} — needs your tips
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--rg-accent)', background: 'var(--rg-accent-bg)', borderRadius: 4, padding: '2px 8px' }}>
                    Locks {new Date(upcomingMatches[0].scheduled_start).toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  {upcomingMatches.slice(0, 3).map(match => (
                    <div
                      key={match.id}
                      style={{
                        padding: '12px 20px',
                        borderBottom: 'var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 500 }}>{match.player1_name}</span>
                        <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>vs</span>
                        <span style={{ fontWeight: 500 }}>{match.player2_name}</span>
                      </span>
                      <Link
                        href={`/tournaments/${tournament.slug}/round/${upcomingRound.name}`}
                        style={{
                          fontSize: 13,
                          color: 'var(--rg-green)',
                          border: '1px solid var(--rg-green)',
                          borderRadius: 6,
                          padding: '4px 12px',
                          textDecoration: 'none',
                        }}
                      >
                        Pick
                      </Link>
                    </div>
                  ))}
                  {upcomingMatches.length > 3 && (
                    <div style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <Link
                        href={`/tournaments/${tournament.slug}/round/${upcomingRound.name}`}
                        style={{ fontSize: 13, color: 'var(--text-muted)' }}
                      >
                        + {upcomingMatches.length - 3} more matches
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
