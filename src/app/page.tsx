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

const WIGGLE_CSS = `
  @keyframes wiggle {
    0%,100% { transform: rotate(-1.8deg) translateY(0px); }
    50%      { transform: rotate( 1.8deg) translateY(-1px); }
  }
  .wiggle { animation: wiggle 0.22s ease-in-out infinite; }
`

function GameIcon({ game, colorIdx, size = 'lg' }: { game: Game; colorIdx: number; size?: 'lg' | 'sm' }) {
  const c = resolveIconColor(game.iconColor, colorIdx)
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
  game, colorIdx, editMode, onLaunch, onEnterEdit,
}: {
  game: Game
  colorIdx: number
  editMode: boolean
  onLaunch: (id: string, rect: { x: number; y: number; w: number; h: number }) => void
  onEnterEdit: () => void
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
      <div ref={iconRef}><GameIcon game={game} colorIdx={colorIdx} size="lg" /></div>
      <span style={{
        fontSize: 14, fontWeight: 500, textAlign: 'center',
        color: 'rgba(0,0,0,0.75)',
        maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {game.name}
      </span>
    </div>
  )
}

function SortableDockItem({
  game, colorIdx, editMode, onLaunch, onEnterEdit,
}: {
  game: Game
  colorIdx: number
  editMode: boolean
  onLaunch: (id: string, rect: { x: number; y: number; w: number; h: number }) => void
  onEnterEdit: () => void
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
      <div ref={iconRef}><GameIcon game={game} colorIdx={colorIdx} size="sm" /></div>
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
  const { games, appTitle, setAppTitle, dockGameIds, gameOrder, setDockGameIds, setGameOrder } = useStore()
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
  // colorIdx from game data takes priority; fall back to position-based index
  const colorMap = Object.fromEntries(orderedGames.map((g, i) => [g.id, g.colorIdx ?? i]))

  const [editMode, setEditMode] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overContainer, setOverContainer] = useState<'grid' | 'dock' | null>(null)
  const [launchingId, setLaunchingId] = useState<string | null>(null)
  const [launchOrigin, setLaunchOrigin] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const activeGame = activeId ? games.find(g => g.id === activeId) : null

  // Sensors only active in edit mode
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: editMode ? { distance: 8 } : { distance: 99999 },
  }))

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

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <style>{WIGGLE_CSS}</style>
      <div
        className="min-h-screen flex flex-col select-none overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #e8eaf0 0%, #dde0e8 50%, #e2e4ec 100%)' }}
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
          {editMode ? (
            <button
              onClick={() => setEditMode(false)}
              style={{
                position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0,0,0,0.12)', borderRadius: 20,
                color: '#333', fontWeight: 600, fontSize: 15,
                padding: '6px 18px', cursor: 'pointer',
              }}
            >
              Done
            </button>
          ) : null}
          {editMode ? (
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'rgba(0,0,0,0.7)', letterSpacing: '-0.3px' }}>
              Edit Home Screen
            </h1>
          ) : titleEditing ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={() => { setAppTitle(titleDraft.trim() || appTitle); setTitleEditing(false) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setAppTitle(titleDraft.trim() || appTitle); setTitleEditing(false) }
                if (e.key === 'Escape') setTitleEditing(false)
              }}
              style={{
                fontSize: 20, fontWeight: 600, color: 'rgba(0,0,0,0.8)', letterSpacing: '-0.3px',
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                border: '1.5px solid rgba(0,0,0,0.18)', borderRadius: 10,
                padding: '4px 12px', outline: 'none', minWidth: 260, textAlign: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            />
          ) : (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={() => setTitleHovered(true)}
              onMouseLeave={() => setTitleHovered(false)}
            >
              <h1 style={{ fontSize: 20, fontWeight: 600, color: 'rgba(0,0,0,0.7)', letterSpacing: '-0.3px', margin: 0 }}>
                {appTitle}
              </h1>
              <button
                onClick={() => { setTitleDraft(appTitle); setTitleEditing(true); setTimeout(() => { titleInputRef.current?.select() }, 0) }}
                style={{
                  opacity: titleHovered ? 1 : 0,
                  transition: 'opacity 0.15s',
                  background: 'rgba(0,0,0,0.07)', border: 'none', borderRadius: 7,
                  cursor: 'pointer', padding: '3px 7px', display: 'flex', alignItems: 'center',
                }}
                title="Edit title"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.24l-2.83.71.71-2.83L11.5 2.5z" stroke="rgba(0,0,0,0.55)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </header>

        {/* App Grid */}
        <main
          className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 pb-36"
          onClick={(e) => { if (editMode && e.target === e.currentTarget) setEditMode(false) }}
        >
          <DroppableGridZone isOver={editMode && overContainer === 'grid' && getContainer(activeId ?? '') === 'dock'}>
            <SortableContext items={gridGames.map(g => g.id)} strategy={rectSortingStrategy} id="grid">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.max(Math.min(gridGames.length, 4), 1)}, 96px)`,
                  gap: '2rem',
                }}
                onClick={(e) => { if (editMode && e.target === e.currentTarget) setEditMode(false) }}
              >
                {gridGames.map(g => (
                  <SortableGridItem
                    key={g.id} game={g}
                    colorIdx={colorMap[g.id] ?? 0}
                    editMode={editMode}
                    onLaunch={handleLaunch}
                    onEnterEdit={() => setEditMode(true)}
                  />
                ))}
                {gridGames.length === 0 && (
                  <div style={{ color: 'rgba(0,0,0,0.25)', textAlign: 'center', padding: '2rem', fontSize: 14 }}>
                    Drag games here
                  </div>
                )}
              </div>
            </SortableContext>
          </DroppableGridZone>
        </main>

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
                      colorIdx={colorMap[g.id] ?? 0}
                      editMode={editMode}
                      onLaunch={handleLaunch}
                      onEnterEdit={() => setEditMode(true)}
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

        {/* Launch overlay */}
        {launchingId && launchOrigin && (() => {
          const launchGame = orderedGames.find(g => g.id === launchingId)
          const c = resolveIconColor(launchGame?.iconColor, colorMap[launchingId] ?? 0)
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

        <DragOverlay>
          {activeGame && (
            <div style={{ opacity: 0.9, cursor: 'grabbing' }}>
              <GameIcon game={activeGame} colorIdx={colorMap[activeGame.id] ?? 0} size={overContainer === 'dock' ? 'sm' : 'lg'} />
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
