import { Game } from '@/lib/types'
import { resolveIconColor } from '@/lib/iconColors'

export default function GameIcon({ game, size = 'lg', style }: { game: Pick<Game, 'icon' | 'iconColor' | 'colorIdx'>; size?: 'lg' | 'sm'; style?: React.CSSProperties }) {
  const c = resolveIconColor(game.iconColor, game.colorIdx ?? null)
  const dim = size === 'lg' ? 96 : 56
  const radius = size === 'lg' ? 26 : 16
  const fontSize = size === 'lg' ? '3rem' : '1.75rem'
  return (
    <div style={{
      width: dim, height: dim, borderRadius: radius,
      background: `linear-gradient(145deg, ${c.from}cc, ${c.to}dd)`,
      boxShadow: `0 8px 32px ${c.from}55, 0 2px 8px rgba(0,0,0,0.5), inset 0 1.5px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.2)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, position: 'relative', overflow: 'hidden', flexShrink: 0,
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: radius,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 45%, transparent 100%)',
      }} />
      <span style={{ position: 'relative', zIndex: 1 }}>{game.icon ?? '🎮'}</span>
    </div>
  )
}
