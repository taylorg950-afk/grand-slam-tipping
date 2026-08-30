import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

// A tennis ball on the US Open navy — reads at a favicon's size and as a
// maskable home-screen icon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#00308F',
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 999,
            background: '#D9EC3C',
            display: 'flex',
          }}
        />
      </div>
    ),
    size
  )
}
