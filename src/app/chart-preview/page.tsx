import RankChart from '@/components/charts/RankChart'

// Positions by round, with the points behind them for the tooltip.
const MOCK_DATA = [
  { round: 'R64', 'Sam Carter': 1, 'Jess Donovan': 3, 'Taylor G': 2, 'Marcus Webb': 5, 'Priya Nair': 4, 'Chris Lam': 6 },
  { round: 'R32', 'Sam Carter': 2, 'Jess Donovan': 3, 'Taylor G': 1, 'Marcus Webb': 5, 'Priya Nair': 4, 'Chris Lam': 6 },
  { round: 'R16', 'Sam Carter': 3, 'Jess Donovan': 2, 'Taylor G': 1, 'Marcus Webb': 5, 'Priya Nair': 4, 'Chris Lam': 6 },
  { round: 'QF',  'Sam Carter': 3, 'Jess Donovan': 1, 'Taylor G': 2, 'Marcus Webb': 5, 'Priya Nair': 4, 'Chris Lam': 6 },
]

const MOCK_POINTS: Record<string, Record<string, number>> = {
  R64: { 'Sam Carter': 52, 'Jess Donovan': 48, 'Taylor G': 50, 'Marcus Webb': 44, 'Priya Nair': 46, 'Chris Lam': 38 },
  R32: { 'Sam Carter': 96, 'Jess Donovan': 92, 'Taylor G': 102, 'Marcus Webb': 84, 'Priya Nair': 86, 'Chris Lam': 78 },
  R16: { 'Sam Carter': 128, 'Jess Donovan': 132, 'Taylor G': 142, 'Marcus Webb': 108, 'Priya Nair': 118, 'Chris Lam': 102 },
  QF:  { 'Sam Carter': 160, 'Jess Donovan': 180, 'Taylor G': 174, 'Marcus Webb': 140, 'Priya Nair': 150, 'Chris Lam': 134 },
}

const CURRENT_USER = 'Taylor G'

export default function ChartPreviewPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          Chart preview — not linked from the app
        </p>

        {/* Simulate the leaderboard card it'll live in */}
        <div style={{
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          background: 'var(--card-bg)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
              Position by round
            </span>
          </div>
          <div style={{ padding: '20px' }}>
            <RankChart data={MOCK_DATA} pointsByRound={MOCK_POINTS} currentUserName={CURRENT_USER} fieldSize={6} />
          </div>
        </div>

        {/* Also show current user in top 4 scenario */}
        <div style={{
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          background: 'var(--card-bg)',
          overflow: 'hidden',
          marginTop: 24,
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
              Position by round — current user leading
            </span>
          </div>
          <div style={{ padding: '20px' }}>
            <RankChart data={MOCK_DATA} pointsByRound={MOCK_POINTS} currentUserName="Jess Donovan" fieldSize={6} />
          </div>
        </div>
      </div>
    </div>
  )
}
