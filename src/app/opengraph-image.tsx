import { ImageResponse } from 'next/og'

// Rendered at build time — this is what shows when someone pastes the link
// into a group chat.
export const alt = 'The Tipping Post — private Grand Slam tipping competition'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(120deg,#002B7F,#00308F 55%,#0A4BC4)',
          color: '#fff',
          padding: '68px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: '#D9EC3C' }} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
            The Tipping Post
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>
            One post. <span style={{ color: '#D9EC3C', marginLeft: 20 }}>Every slam.</span>
          </div>
          <div style={{ fontSize: 30, color: '#C3CEEC', maxWidth: 800, lineHeight: 1.35 }}>
            Tip every match of all four majors. Each slam runs as its own competition.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {['Australian Open', 'Roland-Garros', 'Wimbledon', 'US Open'].map(name => (
            <div
              key={name}
              style={{
                display: 'flex',
                fontSize: 21,
                fontWeight: 600,
                padding: '11px 20px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.12)',
                color: '#DCE8FF',
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
