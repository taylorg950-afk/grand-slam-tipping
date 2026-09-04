export interface UserScore {
  id: string
  display_name: string
  totalPoints: number
  correctTips: number
  totalTips: number
  /** Tips on matches that have actually been decided — the denominator for accuracy. */
  judgedTips: number
}

export function computeScores(
  users: { id: string; display_name: string }[],
  matches: { id: string; round_id: string; winner: string | null; no_points?: boolean }[],
  rounds: { id: string; points_per_correct_tip: number }[],
  tips: { user_id: string; match_id: string; predicted_winner: string }[]
): UserScore[] {
  const pointsMap = Object.fromEntries(rounds.map(r => [r.id, r.points_per_correct_tip]))
  // no_points matches (walkovers etc.) are void — they never award points.
  const matchMap = Object.fromEntries(
    matches.filter(m => m.winner && !m.no_points).map(m => [m.id, { winner: m.winner!, round_id: m.round_id }])
  )

  const scores = users.map(user => {
    const userTips = tips.filter(t => t.user_id === user.id)
    let totalPoints = 0
    let correctTips = 0
    let judgedTips = 0

    for (const tip of userTips) {
      const match = matchMap[tip.match_id]
      // matchMap only holds decided, non-void matches, so anything found here
      // has been judged. A tip on a match still to be played isn't a miss.
      if (!match) continue
      judgedTips++
      if (tip.predicted_winner === match.winner) {
        totalPoints += pointsMap[match.round_id] ?? 0
        correctTips++
      }
    }

    return { ...user, totalPoints, correctTips, totalTips: userTips.length, judgedTips }
  })

  // Ties need a stable order or the dashboard and the standings disagree about
  // who is 1st — the standings already break ties by name, so match it.
  scores.sort((a, b) => b.totalPoints - a.totalPoints || a.display_name.localeCompare(b.display_name))
  return scores
}
