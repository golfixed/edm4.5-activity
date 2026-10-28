'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Game } from '@/lib/types'
import { resolveIconColor } from '@/lib/iconColors'
import { FirebaseStatus } from '@/lib/store'

function adjustHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function wallpaperBg(color: string): string {
  const base = `linear-gradient(160deg, ${adjustHex(color, 10)} 0%, ${color} 50%, ${adjustHex(color, 6)} 100%)`
  return [
    'radial-gradient(ellipse 55% 45% at 18% 14%, rgba(255,255,255,0.38) 0%, transparent 100%)',
    'radial-gradient(ellipse 40% 50% at 82% 78%, rgba(255,255,255,0.22) 0%, transparent 100%)',
    'radial-gradient(ellipse 60% 30% at 55% 95%, rgba(255,255,255,0.14) 0%, transparent 100%)',
    base,
  ].join(', ')
}

function useThaiTime() {
  const fmt = () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' })
  const [time, setTime] = useState(fmt)
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 10_000)
    return () => clearInterval(id)
  }, [])
  return time
}

function hexLuminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const toLinear = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  return 0.2126 * toLinear(n >> 16) + 0.7152 * toLinear((n >> 8) & 0xff) + 0.0722 * toLinear(n & 0xff)
}

function SignalIcon({ status, wallpaperColor }: { status: FirebaseStatus; wallpaperColor: string }) {
  const time = useThaiTime()
  const [hovered, setHovered] = useState(false)

  const lum = hexLuminance(wallpaperColor)
  const isDark = lum < 0.35
  const fg = isDark ? 'rgba(255,255,255,0.80)' : 'rgba(0,0,0,0.55)'
  const bg = isDark ? (hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)') : (hovered ? 'rgba(0,0,0,0.09)' : 'rgba(0,0,0,0.06)')
  const inactive = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'

  const bars = [
    { h: 4, active: true },
    { h: 8, active: status !== 'disconnected' },
    { h: 12, active: status === 'connected' },
  ]
  const signalColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#f59e0b' : '#ef4444'
  const statusText = status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Disconnected'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
        borderRadius: 8, background: bg, cursor: 'default', transition: 'background 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5 }}>
        {bars.map((b, i) => (
          <div
            key={i}
            style={{
              width: 4, height: b.h, borderRadius: 2,
              background: b.active ? signalColor : inactive,
              transition: 'background 0.4s',
              opacity: status === 'connecting' && b.active ? undefined : 1,
              animation: status === 'connecting' && b.active ? `pulse-bar ${0.8 + i * 0.15}s ease-in-out infinite alternate` : 'none',
            }}
          />
        ))}
      </div>
      {hovered && (
        <span style={{ fontSize: 12, fontWeight: 600, color: signalColor, transition: 'color 0.2s' }}>
          {statusText}
        </span>
      )}
      <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums', color: fg, transition: 'color 0.3s' }}>
        {time}
      </span>
      <style>{`@keyframes pulse-bar { from { opacity:0.35 } to { opacity:1 } }`}</style>
    </div>
  )
}

const WIGGLE_CSS = `
  @keyframes wiggle {
    0%,100% { transform: rotate(-1.8deg) translateY(0px); }
    50%      { transform: rotate( 1.8deg) translateY(-1px); }
  }
  .wiggle { animation: wiggle 0.22s ease-in-out infinite; }
`

function GameIcon({ game, size = 'lg' }: { game: Game; size?: 'lg' | 'sm' }) {
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
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: radius,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 45%, transparent 100%)',
      }} />
      <span style={{ position: 'relative', zIndex: 1 }}>{game.icon ?? '🎮'}</span>
    </div>
  )
}

function SortableGridItem({
  game, editMode, isDark, onLaunch, onEnterEdit, onDelete,
}: {
  game: Game
  editMode: boolean
  isDark: boolean
  onLaunch: (id: string, rect: { x: number; y: number; w: number; h: number }) => void
  onEnterEdit: () => void
  onDelete: (game: Game) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: game.id,
    data: { container: 'grid' },
    disabled: !editMode,
  })
  const iconRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const didLongPress = useRef(false)

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  // In edit mode: spread dnd listeners only, no custom pointer handlers (they'd override dnd-kit's onPointerDown)
  // In normal mode: attach long-press handlers, no dnd listeners
  const normalModeHandlers = !editMode ? {
    onPointerDown: (e: React.PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY }
      didLongPress.current = false
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true
        onEnterEdit()
      }, 500)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pointerStart.current) return
      const dx = e.clientX - pointerStart.current.x
      const dy = e.clientY - pointerStart.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 6) cancelLongPress()
    },
    onPointerUp: cancelLongPress,
    onPointerCancel: cancelLongPress,
  } : {}

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(editMode ? listeners : normalModeHandlers)}
      className={editMode && !isDragging ? 'wiggle' : ''}
      onClick={(e) => {
        if (didLongPress.current || editMode) return
        if (!pointerStart.current) return
        const dx = e.clientX - pointerStart.current.x
        const dy = e.clientY - pointerStart.current.y
        if (Math.sqrt(dx * dx + dy * dy) < 6) {
          const r = iconRef.current?.getBoundingClientRect()
          onLaunch(game.id, r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: e.clientX - 48, y: e.clientY - 48, w: 96, h: 96 })
        }
      }}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.25 : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        cursor: editMode ? 'grab' : 'pointer', touchAction: 'none',
      }}
    >
      <div ref={iconRef} style={{ position: 'relative' }}>
        <GameIcon game={game} size="lg" />
        {editMode && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(game) }}
            style={{
              position: 'absolute', top: -8, right: -8,
              width: 24, height: 24, borderRadius: '50%',
              background: '#ff3b30', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
              color: 'white', fontSize: 14, fontWeight: 700, lineHeight: 1,
              padding: 0, zIndex: 10,
            }}
          >×</button>
        )}
      </div>
      <span style={{
        fontSize: 14, fontWeight: 500, textAlign: 'center',
        color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.75)',
        maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'color 0.3s',
        textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
      }}>
        {game.name}
      </span>
    </div>
  )
}

function SortableDockItem({
  game, editMode, onLaunch, onEnterEdit, onDelete,
}: {
  game: Game
  editMode: boolean
  onLaunch: (id: string, rect: { x: number; y: number; w: number; h: number }) => void
  onEnterEdit: () => void
  onDelete: (game: Game) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: game.id,
    data: { container: 'dock' },
    disabled: !editMode,
  })
  const iconRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const didLongPress = useRef(false)

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  const normalModeHandlers = !editMode ? {
    onPointerDown: (e: React.PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY }
      didLongPress.current = false
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true
        onEnterEdit()
      }, 500)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pointerStart.current) return
      const dx = e.clientX - pointerStart.current.x
      const dy = e.clientY - pointerStart.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 6) cancelLongPress()
    },
    onPointerUp: cancelLongPress,
    onPointerCancel: cancelLongPress,
  } : {}

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(editMode ? listeners : normalModeHandlers)}
      className={editMode && !isDragging ? 'wiggle' : ''}
      onClick={(e) => {
        if (didLongPress.current || editMode) return
        if (!pointerStart.current) return
        const dx = e.clientX - pointerStart.current.x
        const dy = e.clientY - pointerStart.current.y
        if (Math.sqrt(dx * dx + dy * dy) < 6) {
          const r = iconRef.current?.getBoundingClientRect()
          onLaunch(game.id, r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: e.clientX - 28, y: e.clientY - 28, w: 56, h: 56 })
        }
      }}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.25 : 1,
        cursor: editMode ? 'grab' : 'pointer', touchAction: 'none', flexShrink: 0,
      }}
    >
      <div ref={iconRef} style={{ position: 'relative' }}>
        <GameIcon game={game} size="sm" />
        {editMode && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(game) }}
            style={{
              position: 'absolute', top: -8, right: -8,
              width: 20, height: 20, borderRadius: '50%',
              background: '#ff3b30', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
              color: 'white', fontSize: 12, fontWeight: 700, lineHeight: 1,
              padding: 0, zIndex: 10,
            }}
          >×</button>
        )}
      </div>
    </div>
  )
}

function DroppableDockZone({ children, isOver }: { children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: 'dock-zone' })
  return (
    <div ref={setNodeRef} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      minWidth: 56, minHeight: 56, borderRadius: 12,
      transition: 'background 0.15s',
      background: isOver ? 'rgba(255,255,255,0.12)' : 'transparent',
      padding: isOver ? '4px' : '0',
    }}>
      {children}
    </div>
  )
}

function DroppableGridZone({ children, isOver }: { children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: 'grid-zone' })
  return (
    <div ref={setNodeRef} style={{
      minWidth: 200, minHeight: 120,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 20, transition: 'background 0.15s',
      background: isOver ? 'rgba(255,255,255,0.06)' : 'transparent',
      padding: '1rem',
    }}>
      {children}
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { games, setGames, appTitle, setAppTitle, appTitleSize, setAppTitleSize, dockGameIds, gameOrder, setDockGameIds, setGameOrder, firebaseStatus, wallpaperColor, isHydrated } = useStore()
  const [returnAnim, setReturnAnim] = useState<{ origin: { x: number; y: number; w: number; h: number }; game: Game } | null>(null)

  useEffect(() => {
    try {
      const returnId = sessionStorage.getItem('returnFromGame')
      const originRaw = sessionStorage.getItem('launchOrigin')
      if (returnId && originRaw) {
        const origin = JSON.parse(originRaw)
        const g = games.find(x => x.id === returnId)
        if (g && origin) {
          setReturnAnim({ origin, game: g })
          setTimeout(() => setReturnAnim(null), 420)
        }
        sessionStorage.removeItem('returnFromGame')
        sessionStorage.removeItem('launchOrigin')
      }
    } catch {}
  }, [games])

  const [titleEditing, setTitleEditing] = useState(false)
  const [titleHovered, setTitleHovered] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const orderedGames = (() => {
    const map = Object.fromEntries(games.map(g => [g.id, g]))
    const order = gameOrder.length ? gameOrder : games.map(g => g.id)
    const ordered = order.map(id => map[id]).filter(Boolean) as Game[]
    // Append any new games not yet in gameOrder
    const seen = new Set(order)
    games.forEach(g => { if (!seen.has(g.id)) ordered.push(g) })
    return ordered
  })()

  const dockSet = new Set(dockGameIds)
  const gridGames = orderedGames.filter(g => !dockSet.has(g.id))
  const dockGames = dockGameIds.map(id => orderedGames.find(g => g.id === id)).filter(Boolean) as Game[]

  const COLS = 5
  const ROWS = 3
  const PAGE_SIZE = COLS * ROWS

  const [editMode, setEditMode] = useState(false)
  const [deleteConfirmGame, setDeleteConfirmGame] = useState<Game | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const pageDragRef = useRef<{ startX: number } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overContainer, setOverContainer] = useState<'grid' | 'dock' | null>(null)
  const [launchingId, setLaunchingId] = useState<string | null>(null)
  const [launchOrigin, setLaunchOrigin] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const activeGame = activeId ? games.find(g => g.id === activeId) : null

  // Sensors only active in edit mode
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: editMode ? { distance: 8 } : { distance: 99999 },
  }))

  const isDark = hexLuminance(wallpaperColor) < 0.35
  const labelColor = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.70)'

  // ESC key exits edit mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditMode(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const getContainer = (id: string): 'grid' | 'dock' =>
    dockSet.has(id) ? 'dock' : 'grid'

  const handleLaunch = (gameId: string, rect: { x: number; y: number; w: number; h: number }) => {
    setLaunchOrigin(rect)
    setLaunchingId(gameId)
    sessionStorage.setItem('launchOrigin', JSON.stringify(rect))
    setTimeout(() => router.push(`/game/${gameId}`), 400)
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
    setOverContainer(getContainer(active.id as string))
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) { setOverContainer(null); return }
    const overId = over.id as string
    if (overId === 'dock-zone' || dockSet.has(overId)) setOverContainer('dock')
    else setOverContainer('grid')
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setOverContainer(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string
    const fromContainer = getContainer(activeId)
    const toContainer: 'grid' | 'dock' =
      overId === 'dock-zone' || dockSet.has(overId) ? 'dock' : 'grid'

    if (fromContainer === 'grid' && toContainer === 'dock') {
      if (!dockSet.has(activeId)) {
        const insertIdx = dockSet.has(overId) ? dockGameIds.indexOf(overId) : dockGameIds.length
        const newDock = [...dockGameIds]
        newDock.splice(insertIdx === -1 ? dockGameIds.length : insertIdx, 0, activeId)
        setDockGameIds(newDock)
      }
    } else if (fromContainer === 'dock' && toContainer === 'grid') {
      const newDock = dockGameIds.filter(id => id !== activeId)
      setDockGameIds(newDock)
      if (overId !== 'grid-zone' && !dockSet.has(overId)) {
        const currentOrder = orderedGames.map(g => g.id)
        const fromIdx = currentOrder.indexOf(activeId)
        const toIdx = currentOrder.indexOf(overId)
        if (fromIdx !== -1 && toIdx !== -1) setGameOrder(arrayMove(currentOrder, fromIdx, toIdx))
      }
    } else if (fromContainer === 'dock' && toContainer === 'dock') {
      const oldIdx = dockGameIds.indexOf(activeId)
      const newIdx = dockSet.has(overId) ? dockGameIds.indexOf(overId) : dockGameIds.length - 1
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx)
        setDockGameIds(arrayMove(dockGameIds, oldIdx, newIdx))
    } else {
      if (overId !== 'grid-zone') {
        const currentOrder = orderedGames.map(g => g.id)
        const fromIdx = currentOrder.indexOf(activeId)
        const toIdx = currentOrder.indexOf(overId)
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx)
          setGameOrder(arrayMove(currentOrder, fromIdx, toIdx))
      }
    }
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center select-none overflow-hidden"
        style={{ background: wallpaperBg(wallpaperColor) }}>
        <svg style={{ display: 'none' }}>
          <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
            <feComponentTransfer in="turbulence" result="mapped">
              <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
              <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
              <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
            </feComponentTransfer>
            <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
            <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
              <fePointLight x="-200" y="-200" z="300" />
            </feSpecularLighting>
            <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
            <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {/* Header skeleton */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '40px 32px 16px' }}>
          <div style={{ width: 180, height: 22, borderRadius: 8, background: 'rgba(0,0,0,0.10)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        {/* Game icon skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 96px)', gap: '2rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 76, height: 76, borderRadius: 18, background: 'rgba(0,0,0,0.10)', animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
              <div style={{ width: 56, height: 10, borderRadius: 5, background: 'rgba(0,0,0,0.08)', animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
            </div>
          ))}
        </div>
        {/* Dock skeleton — same structure as real dock */}
        <div className="fixed bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto relative overflow-hidden" style={{ borderRadius: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backdropFilter: 'blur(20px)', filter: 'url(#glass-distortion)', borderRadius: '2rem', overflow: 'hidden' }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(255,255,255,0.55)', borderRadius: '2rem' }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: '2rem', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.6)' }} />
            <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(0,0,0,0.08)', animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
              <div style={{ width: 1, height: 40, background: 'rgba(0,0,0,0.15)', borderRadius: 1, flexShrink: 0 }} />
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(0,0,0,0.06)' }} />
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(0,0,0,0.06)' }} />
            </div>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <style>{WIGGLE_CSS}</style>
      <div
        className="min-h-screen flex flex-col select-none overflow-hidden"
        style={{ background: wallpaperBg(wallpaperColor) }}
        onClick={(e) => {
          // Exit edit mode when clicking on background (not on an icon)
          if (editMode && e.target === e.currentTarget) setEditMode(false)
        }}
      >
        <svg style={{ display: 'none' }}>
          <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
            <feComponentTransfer in="turbulence" result="mapped">
              <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
              <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
              <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
            </feComponentTransfer>
            <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
            <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
              <fePointLight x="-200" y="-200" z="300" />
            </feSpecularLighting>
            <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
            <feDisplacementMap in="SourceGraphic" in2="softMap" scale="150" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-center px-8 pt-10 pb-4" style={{ minHeight: 64 }}>
          {!editMode && <SignalIcon status={firebaseStatus} wallpaperColor={wallpaperColor} />}
          {editMode ? (
            <button
              onClick={() => setEditMode(false)}
              style={{
                position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
                background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)'}`,
                borderRadius: 20,
                color: labelColor, fontWeight: 600, fontSize: 15,
                padding: '6px 18px', cursor: 'pointer',
              }}
            >
              Done
            </button>
          ) : null}
          {editMode ? (
            <h1 style={{ fontSize: 20, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)', letterSpacing: '-0.3px' }}>
              Edit Home Screen
            </h1>
          ) : titleEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { setAppTitle(titleDraft.trim() || appTitle); setTitleEditing(false) }
                    if (e.key === 'Escape') setTitleEditing(false)
                  }}
                  style={{
                    fontSize: appTitleSize, fontWeight: 600, color: 'rgba(0,0,0,0.8)', letterSpacing: '-0.3px',
                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                    border: '1.5px solid rgba(0,0,0,0.18)', borderRadius: 10,
                    padding: '4px 12px', outline: 'none', minWidth: 260, textAlign: 'center',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <button
                  onClick={() => { setAppTitle(titleDraft.trim() || appTitle); setTitleEditing(false) }}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.10)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'}`,
                    borderRadius: 10, color: labelColor, fontWeight: 600, fontSize: 14,
                    padding: '5px 14px', cursor: 'pointer', backdropFilter: 'blur(8px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Save
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', fontWeight: 500, width: 14, textAlign: 'center' }}>A</span>
                <input
                  type="range" min={12} max={48} step={1}
                  value={appTitleSize}
                  onChange={e => setAppTitleSize(Number(e.target.value))}
                  style={{ width: 140, accentColor: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 17, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', fontWeight: 500, width: 18, textAlign: 'center' }}>A</span>
              </div>
            </div>
          ) : (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={() => setTitleHovered(true)}
              onMouseLeave={() => setTitleHovered(false)}
            >
              <h1 style={{ fontSize: appTitleSize, fontWeight: 600, color: labelColor, letterSpacing: '-0.3px', margin: 0, transition: 'color 0.3s', textShadow: isDark ? '0 1px 4px rgba(0,0,0,0.35)' : 'none' }}>
                {appTitle}
              </h1>
              <button
                onClick={() => { setTitleDraft(appTitle); setTitleEditing(true); setTimeout(() => { titleInputRef.current?.select() }, 0) }}
                style={{
                  opacity: titleHovered ? 1 : 0,
                  transition: 'opacity 0.15s',
                  background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)', border: 'none', borderRadius: 7,
                  cursor: 'pointer', padding: '3px 7px', display: 'flex', alignItems: 'center',
                }}
                title="Edit title"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24l-2.83.71.71-2.83L11.5 2.5z" stroke={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </header>

        {/* App Grid — paginated */}
        {(() => {
          const pageCount = Math.max(1, Math.ceil(gridGames.length / PAGE_SIZE))
          const safePage = Math.min(currentPage, pageCount - 1)
          const pageGames = gridGames.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
          // Pad to full PAGE_SIZE so every page has the same 5×3 footprint
          const paddedGames: (Game | null)[] = [...pageGames, ...Array(PAGE_SIZE - pageGames.length).fill(null)]
          const CELL = 96
          const GAP = 48 // 3rem
          const PAD = 20 // extra padding so delete-badge shadows aren't clipped
          const gridW = COLS * CELL + (COLS - 1) * GAP

          return (
            <main
              className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 pb-36"
              onClick={(e) => { if (editMode && e.target === e.currentTarget) setEditMode(false) }}
            >
              {/* Carousel viewport */}
              <div
                style={{ overflow: 'visible', width: gridW + PAD * 2, cursor: pageCount > 1 ? 'grab' : 'default' }}
                onWheel={e => {
                  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
                  if (delta > 30) setCurrentPage(p => Math.min(p + 1, pageCount - 1))
                  else if (delta < -30) setCurrentPage(p => Math.max(p - 1, 0))
                }}
                onPointerDown={e => { pageDragRef.current = { startX: e.clientX } }}
                onPointerUp={e => {
                  if (!pageDragRef.current) return
                  const dx = e.clientX - pageDragRef.current.startX
                  if (dx < -40) setCurrentPage(p => Math.min(p + 1, pageCount - 1))
                  else if (dx > 40) setCurrentPage(p => Math.max(p - 1, 0))
                  pageDragRef.current = null
                }}
              >
                <DroppableGridZone isOver={editMode && overContainer === 'grid' && getContainer(activeId ?? '') === 'dock'}>
                  <SortableContext items={gridGames.map(g => g.id)} strategy={rectSortingStrategy} id="grid">
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
                        gap: GAP,
                        padding: PAD,
                      }}
                      onClick={(e) => { if (editMode && e.target === e.currentTarget) setEditMode(false) }}
                    >
                      {paddedGames.map((g, i) => g ? (
                        <SortableGridItem
                          key={g.id} game={g}
                          editMode={editMode}
                          isDark={isDark}
                          onLaunch={handleLaunch}
                          onEnterEdit={() => setEditMode(true)}
                          onDelete={setDeleteConfirmGame}
                        />
                      ) : (
                        <div key={`empty-${i}`} style={{ width: CELL, height: CELL }} />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableGridZone>
              </div>

              {/* Page indicator dots */}
              {pageCount > 1 && (
                <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      style={{
                        width: safePage === i ? 20 : 7,
                        height: 7,
                        borderRadius: 4,
                        border: 'none',
                        background: safePage === i
                          ? (isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)')
                          : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'width 0.2s, background 0.2s',
                      }}
                    />
                  ))}
                </div>
              )}
            </main>
          )
        })()}

        {/* Dock */}
        <div className="fixed bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="pointer-events-auto relative overflow-hidden" style={{ borderRadius: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backdropFilter: 'blur(20px)', filter: 'url(#glass-distortion)', borderRadius: '2rem', overflow: 'hidden' }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(255,255,255,0.55)', borderRadius: '2rem' }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: '2rem', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.6)' }} />
            <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: 16, padding: 16 }}>
              <SortableContext items={dockGames.map(g => g.id)} strategy={horizontalListSortingStrategy} id="dock">
                <DroppableDockZone isOver={editMode && overContainer === 'dock' && getContainer(activeId ?? '') === 'grid'}>
                  {dockGames.map(g => (
                    <SortableDockItem
                      key={g.id} game={g}
                      editMode={editMode}
                      onLaunch={handleLaunch}
                      onEnterEdit={() => setEditMode(true)}
                      onDelete={setDeleteConfirmGame}
                    />
                  ))}
                  {dockGames.length === 0 && (
                    <div style={{
                      width: 56, height: 56, borderRadius: 12,
                      border: `2px dashed ${editMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.2s',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 3v14M3 10h14" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </DroppableDockZone>
              </SortableContext>

              <div style={{ width: 1, height: 40, background: 'rgba(0,0,0,0.15)', borderRadius: 1, flexShrink: 0 }} />

              <DockUtilIcon href="/admin" emoji="⚙️" color={{ from: '#6b7280', to: '#374151' }} />
              <DockUtilIcon href="/scoreboard" emoji="📊" color={{ from: '#3b82f6', to: '#1d4ed8' }} />
            </div>
          </div>
        </div>

        {/* Return (close) animation overlay — plays on home after navigating back from game */}
        {returnAnim && (() => {
          const { origin: { x, y, w, h }, game: rg } = returnAnim
          const c = resolveIconColor(rg.iconColor, rg.colorIdx ?? null)
          const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
          const vh = typeof window !== 'undefined' ? window.innerHeight : 900
          const scaleTarget = (Math.sqrt(vw * vw + vh * vh) / Math.max(w, h)) * 2
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none', overflow: 'hidden' }}>
              <style>{`@keyframes returnZoom { 0% { transform:scale(${scaleTarget}); opacity:1; } 85% { opacity:1; } 100% { transform:scale(1); opacity:0; } }`}</style>
              <div style={{
                position: 'absolute', left: x, top: y, width: w, height: h,
                borderRadius: w / 3,
                background: `linear-gradient(145deg, ${c.from}, ${c.to})`,
                transformOrigin: 'center center',
                animation: 'returnZoom 0.4s cubic-bezier(0.4,0,0.2,1) forwards',
              }} />
            </div>
          )
        })()}

        {/* Launch overlay */}
        {launchingId && launchOrigin && (() => {
          const launchGame = orderedGames.find(g => g.id === launchingId)
          const c = resolveIconColor(launchGame?.iconColor, launchGame?.colorIdx ?? null)
          const { x, y, w, h } = launchOrigin
          const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
          const vh = typeof window !== 'undefined' ? window.innerHeight : 900
          const scaleTarget = (Math.sqrt(vw * vw + vh * vh) / Math.max(w, h)) * 2
          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none', overflow: 'hidden' }}>
              <style>{`@keyframes launchZoom { 0% { transform:scale(1); opacity:0.85; } 100% { transform:scale(${scaleTarget}); opacity:1; } }`}</style>
              <div style={{
                position: 'absolute', left: x, top: y, width: w, height: h,
                borderRadius: w / 3,
                background: `linear-gradient(145deg, ${c.from}, ${c.to})`,
                transformOrigin: 'center center',
                animation: 'launchZoom 0.38s cubic-bezier(0.4,0,0.6,1) forwards',
              }} />
            </div>
          )
        })()}

        {/* Delete confirm modal */}
        {deleteConfirmGame && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
            onClick={() => setDeleteConfirmGame(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'rgba(30,30,32,0.96)', borderRadius: 20, padding: '28px 32px', minWidth: 280, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>{deleteConfirmGame.icon ?? '🎮'}</div>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Delete "{deleteConfirmGame.name}"?</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 24 }}>This will permanently remove the game and all its data.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDeleteConfirmGame(null)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
                >Cancel</button>
                <button
                  onClick={() => {
                    const id = deleteConfirmGame.id
                    setGames(games.filter(g => g.id !== id))
                    setGameOrder(gameOrder.filter(i => i !== id))
                    setDockGameIds(dockGameIds.filter(i => i !== id))
                    setDeleteConfirmGame(null)
                  }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', background: '#ff3b30', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >Delete</button>
              </div>
            </div>
          </div>
        )}

        <DragOverlay>
          {activeGame && (
            <div style={{ opacity: 0.9, cursor: 'grabbing' }}>
              <GameIcon game={activeGame} size={overContainer === 'dock' ? 'sm' : 'lg'} />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

function DockUtilIcon({ href, emoji, color }: { href: string; emoji: string; color: { from: string; to: string } }) {
  return (
    <Link href={href} style={{ flexShrink: 0 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: `linear-gradient(145deg, ${color.from}cc, ${color.to}dd)`,
        boxShadow: `0 4px 16px ${color.from}44, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'linear-gradient(160deg, rgba(255,255,255,0.25) 0%, transparent 50%)' }} />
        <span style={{ position: 'relative', zIndex: 1 }}>{emoji}</span>
      </div>
    </Link>
  )
}
