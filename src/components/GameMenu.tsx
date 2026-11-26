'use client'

import { useEffect, useRef, useState } from 'react'

const minusIcon = <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9" /></svg>
const plusIcon = <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9M8 3.5v9" /></svg>

export const UI_SCALE_MIN = 0.75
export const UI_SCALE_MAX = 2

/** − 100% + stepper for a game screen's UI scale (steps of 10%). */
export function ScaleControls({ scale, onChange }: { scale: number; onChange: (next: number) => void }) {
  const step = (d: number) => onChange(Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, +(scale + d).toFixed(1))))
  const btn = 'w-8 h-[34px] flex items-center justify-center text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-40'
  return (
    <div className="flex items-center border border-orange-200 bg-white rounded-lg overflow-hidden flex-shrink-0">
      <button onClick={() => step(-0.1)} disabled={scale <= UI_SCALE_MIN} className={btn} title="ลดขนาด">{minusIcon}</button>
      <span className="text-orange-800/60 text-xs w-11 text-center tabular-nums border-x border-orange-100 h-[34px] flex items-center justify-center">
        {Math.round(scale * 100)}%
      </span>
      <button onClick={() => step(0.1)} disabled={scale >= UI_SCALE_MAX} className={btn} title="เพิ่มขนาด">{plusIcon}</button>
    </div>
  )
}

/**
 * ⋯ menu for a game header: screen size, ตั้งค่าเกม, then any extra items (children) below a
 * divider. Clicking any role="menuitem" closes it; so does clicking outside or Esc.
 */
export default function GameMenu({ uiScale, onScaleChange, onOpenSettings, children }: {
  uiScale: number
  onScaleChange: (next: number) => void
  onOpenSettings?: () => void
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border border-orange-200 text-orange-700 text-sm hover:bg-orange-50 transition-colors whitespace-nowrap ${open ? 'bg-orange-50' : 'bg-white'}`}
        aria-haspopup="menu" aria-expanded={open}
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="13" cy="8" r="1.5" /></svg>
        เพิ่มเติม
      </button>
      {open && (
        <div role="menu"
          onClick={(e) => { if ((e.target as HTMLElement).closest('[role="menuitem"]')) setOpen(false) }}
          className="absolute right-0 top-full mt-2 w-72 z-50 bg-white border border-orange-100 rounded-xl shadow-lg p-1.5">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="flex items-center gap-3 text-gray-700 text-sm font-semibold">
              <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="6.5" /><path d="M20.5 20.5 16 16M8.5 11h5M11 8.5v5" />
              </svg>
              ขนาดหน้าจอ
            </span>
            <ScaleControls scale={uiScale} onChange={onScaleChange} />
          </div>
          {onOpenSettings && (
            <button role="menuitem" onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-gray-700 text-sm font-semibold hover:bg-orange-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ตั้งค่าเกม
            </button>
          )}
          {children && <>
            <div className="my-1 border-t border-orange-100" />
            {children}
          </>}
        </div>
      )}
    </div>
  )
}
