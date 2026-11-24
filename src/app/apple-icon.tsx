import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const PIPS = [[0.3125, 0.3125], [0.6875, 0.3125], [0.5, 0.5], [0.3125, 0.6875], [0.6875, 0.6875]]

export default function AppleIcon() {
  const pip = 34
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', background: 'linear-gradient(#F97316, #DC2626)' }}>
        {PIPS.map(([x, y], i) => (
          <div key={i} style={{
            position: 'absolute', width: pip, height: pip, borderRadius: pip,
            left: x * 180 - pip / 2, top: y * 180 - pip / 2, background: '#fff',
          }} />
        ))}
      </div>
    ),
    size,
  )
}
