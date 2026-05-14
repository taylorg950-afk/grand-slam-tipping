'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface CumulativePointsData {
  round: string
  [displayName: string]: string | number
}

interface Props {
  data: CumulativePointsData[]
  currentUserName: string
}

const TOP_COLOURS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981']
const ACCENT_COLOUR = '#B85433'
const USER_COLOUR = '#3D4F2B'
const OTHERS_COLOUR = '#1B181430'

function buildSeriesConfig(data: CumulativePointsData[], currentUserName: string) {
  if (data.length === 0) return []

  const names = Object.keys(data[data.length - 1]).filter(k => k !== 'round')
  const finalRound = data[data.length - 1]

  const sorted = [...names].sort((a, b) => (finalRound[b] as number) - (finalRound[a] as number))

  return sorted.map((name, i) => {
    const isCurrentUser = name === currentUserName
    if (isCurrentUser) {
      return { name, colour: USER_COLOUR, strokeWidth: 2.5, dashed: false, showDot: true, inLegend: true }
    }
    if (i === 0) {
      return { name, colour: ACCENT_COLOUR, strokeWidth: 2.5, dashed: false, showDot: true, inLegend: true }
    }
    if (i < 5) {
      return { name, colour: TOP_COLOURS[i - 1], strokeWidth: 2, dashed: false, showDot: false, inLegend: true }
    }
    return { name, colour: OTHERS_COLOUR, strokeWidth: 1, dashed: true, showDot: false, inLegend: false }
  })
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; stroke: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const sorted = [...payload].sort((a, b) => b.value - a.value)

  return (
    <div style={{
      background: '#F2EBDC',
      border: '1px solid #1B181420',
      borderRadius: 2,
      padding: '8px 12px',
      fontSize: 13,
      minWidth: 160,
    }}>
      <p style={{ color: '#3C342C', marginBottom: 6, fontSize: 12 }}>{label}</p>
      {sorted.map(entry => (
        <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ color: '#3C342C' }}>{entry.name}</span>
          <span style={{ fontWeight: 500, color: '#1B1814', fontVariantNumeric: 'tabular-nums' }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CumulativePointsChart({ data, currentUserName }: Props) {
  const series = buildSeriesConfig(data, currentUserName)
  const namedSeries = series.filter(s => s.inLegend)
  const otherCount = series.filter(s => !s.inLegend).length

  const finalRound = data[data.length - 1] ?? {}
  const leader = series[0]?.name

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 16 }}>
        {namedSeries.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: s.name === leader ? 2.5 : 2, borderRadius: 1, background: s.colour, flexShrink: 0 }} />
            <span style={{
              fontSize: 13,
              color: s.name === leader || s.name === currentUserName ? '#1B1814' : '#3C342C',
              fontWeight: s.name === leader || s.name === currentUserName ? 500 : 400,
            }}>
              {s.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {finalRound[s.name] ?? 0}
            </span>
          </div>
        ))}
        {otherCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 1, borderRadius: 1, background: OTHERS_COLOUR, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#1B181450' }}>+ {otherCount} others</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="#1B181415" strokeOpacity={1} />
          <XAxis
            dataKey="round"
            tick={{ fontSize: 12, fill: '#3C342C' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#3C342C' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {series.map(s => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.colour}
              strokeWidth={s.strokeWidth}
              strokeDasharray={s.dashed ? '4 3' : undefined}
              dot={s.showDot ? { r: 3, fill: s.colour, strokeWidth: 0 } : false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
