export const ICON_COLORS = [
  { from: '#a855f7', to: '#7c3aed' },
  { from: '#06b6d4', to: '#2563eb' },
  { from: '#10b981', to: '#0d9488' },
  { from: '#f43f5e', to: '#db2777' },
  { from: '#f59e0b', to: '#ea580c' },
  { from: '#6366f1', to: '#4338ca' },
  { from: '#ec4899', to: '#9333ea' },
  { from: '#14b8a6', to: '#0284c7' },
]

export const UNSET_ICON_COLOR = { from: '#d1d5db', to: '#9ca3af' }

export function resolveIconColor(
  iconColor?: { from: string; to: string } | null,
  colorIdx?: number | null,
): { from: string; to: string } {
  if (iconColor) return iconColor
  if (colorIdx != null) return ICON_COLORS[colorIdx % ICON_COLORS.length]
  return UNSET_ICON_COLOR
}

/** Darken a hex color by `amount` (0–1) to auto-generate a `to` gradient stop. */
export function darkenHex(hex: string, amount = 0.28): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)))
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}
