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

// US Open series palette — validated (scripts/validate_palette.js, light mode):
// electric blue is reserved for "you"; the top tippers take a colour each in
// standing order; everyone beyond folds into a muted "+ N others".
const USER_COLOUR = '#1B4DD8'
const SERIES_COLOURS = ['#1C7A4B', '#6C5CE7', '#A9741F', '#1F9E8A', '#C24B2C']
const OTHERS_COLOUR = 'rgba(11,20,55,0.22)'

function buildSeriesConfig(data: CumulativePointsData[], currentUserName: string) {
  if (data.length === 0) return []

  const names = Object.keys(data[data.length - 1]).filter(k => k !== 'round')
  const finalRound = data[data.length - 1]

  const sorted = [...names].sort((a, b) => (finalRound[b] as number) - (finalRound[a] as number))

  let colourIdx = 0
  return sorted.map(name => {
    if (name === currentUserName) {
      return { name, colour: USER_COLOUR, strokeWidth: 3, dashed: false, showDot: true, inLegend: true }
    }
    if (colourIdx < SERIES_COLOURS.length) {
      const colour = SERIES_COLOURS[colourIdx++]
      return { name, colour, strokeWidth: 2, dashed: false, showDot: false, inLegend: true }
    }
    return { name, colour: OTHERS_COLOUR, strokeWidth: 1, dashed: true, showDot: false, inLegend: false }
  })
}

/**
 * Y-axis range that frames the pack instead of the origin.
 *
 * Recharts defaults a numeric axis to [0, auto]. Once everyone is a long way
 * from zero that spends most of the height on empty space and presses the
 * lines together, which is the opposite of what this chart is for. So the axis
 * is baselined just under the last-placed tipper and padded at both ends, on a
 * round step so the ticks stay readable. The caption says the axis is cut.
 */
function niceDomain(data: CumulativePointsData[]): [number, number] | undefined {
  const values = data.flatMap(row =>
    Object.entries(row).filter(([k, v]) => k !== 'round' && typeof v === 'number').map(([, v]) => v as number))
  if (values.length === 0) return undefined

  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo
  if (span === 0) return undefined              // one flat line: let recharts decide

  const step = span > 200 ? 25 : span > 80 ? 10 : 5
  const pad = Math.max(step, Math.round(span * 0.12))
  return [Math.max(0, Math.floor((lo - pad) / step) * step), Math.ceil((hi + pad) / step) * step]
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
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 12,
      boxShadow: '0 14px 30px -20px rgba(0,48,143,0.4)',
      padding: '10px 14px',
      fontSize: 13,
      minWidth: 160,
    }}>
      <p style={{ color: 'var(--ink-2)', marginBottom: 6, fontSize: 12 }}>{label}</p>
      {sorted.map(entry => (
        <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
          <span style={{ color: 'var(--ink-2)' }}>{entry.name}</span>
          <span style={{ fontWeight: 500, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
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
  const domain = niceDomain(data)

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 16 }}>
        {namedSeries.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: s.name === leader ? 2.5 : 2, borderRadius: 1, background: s.colour, flexShrink: 0 }} />
            <span style={{
              fontSize: 13,
              color: s.name === leader || s.name === currentUserName ? 'var(--ink)' : 'var(--ink-2)',
              fontWeight: s.name === leader || s.name === currentUserName ? 500 : 400,
            }}>
              {s.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
              {finalRound[s.name] ?? 0}
            </span>
          </div>
        ))}
        {otherCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 1, borderRadius: 1, background: OTHERS_COLOUR, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>+ {otherCount} others</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="rgba(11,20,55,0.08)" strokeOpacity={1} />
          <XAxis
            dataKey="round"
            tick={{ fontSize: 12, fill: 'var(--ink-2)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--ink-2)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={domain}
            width={38}
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
