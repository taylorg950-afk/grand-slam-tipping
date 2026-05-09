export interface UserScore {
  id: string
  display_name: string
  totalPoints: number
  correctTips: number
  totalTips: number
}

export function computeScores(
  users: { id: string; display_name: string }[],
  matches: { id: string; round_id: string; winner: string | null }[],
  rounds: { id: string; points_per_correct_tip: number }[],
  tips: { user_id: string; match_id: string; predicted_winner: string }[]
): UserScore[] {
  const pointsMap = Object.fromEntries(rounds.map(r => [r.id, r.points_per_correct_tip]))
  const matchMap = Object.fromEntries(
    matches.filter(m => m.winner).map(m => [m.id, { winner: m.winner!, round_id: m.round_id }])
  )

  const scores = users.map(user => {
    const userTips = tips.filter(t => t.user_id === user.id)
    let totalPoints = 0
    let correctTips = 0

    for (const tip of userTips) {
      const match = matchMap[tip.match_id]
      if (match && tip.predicted_winner === match.winner) {
        totalPoints += pointsMap[match.round_id] ?? 0
        correctTips++
      }
    }

    return { ...user, totalPoints, correctTips, totalTips: userTips.length }
  })

  scores.sort((a, b) => b.totalPoints - a.totalPoints)
  return scores
}
