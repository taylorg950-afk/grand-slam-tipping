import CumulativePointsChart from '@/components/charts/CumulativePointsChart'

const MOCK_DATA = [
  { round: 'Start', 'Sam Carter': 0, 'Jess Donovan': 0, 'Taylor G': 0, 'Marcus Webb': 0, 'Priya Nair': 0, 'Chris Lam': 0 },
  { round: 'R64',   'Sam Carter': 52, 'Jess Donovan': 48, 'Taylor G': 50, 'Marcus Webb': 44, 'Priya Nair': 46, 'Chris Lam': 38 },
  { round: 'R32',   'Sam Carter': 96, 'Jess Donovan': 92, 'Taylor G': 102, 'Marcus Webb': 84, 'Priya Nair': 86, 'Chris Lam': 78 },
  { round: 'R16',   'Sam Carter': 128, 'Jess Donovan': 132, 'Taylor G': 142, 'Marcus Webb': 108, 'Priya Nair': 118, 'Chris Lam': 102 },
  { round: 'QF',    'Sam Carter': 160, 'Jess Donovan': 180, 'Taylor G': 174, 'Marcus Webb': 140, 'Priya Nair': 150, 'Chris Lam': 134 },
]

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
              Cumulative points by round
            </span>
          </div>
          <div style={{ padding: '20px' }}>
            <CumulativePointsChart data={MOCK_DATA} currentUserName={CURRENT_USER} />
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
              Cumulative points by round — current user leading
            </span>
          </div>
          <div style={{ padding: '20px' }}>
            <CumulativePointsChart data={MOCK_DATA} currentUserName="Jess Donovan" />
          </div>
        </div>
      </div>
    </div>
  )
}
