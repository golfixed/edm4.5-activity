'use client'

import { useState, type ReactNode } from 'react'
import GameMenu from '../GameMenu'
import { zoomFit } from '@/lib/zoomFit'

export const INK = '#3b2414'
export const cardCls = 'bg-white border border-orange-100 shadow-sm rounded-3xl p-6 [@media(max-height:760px)]:p-4'
export const outlineBtnCls = 'flex-1 py-3 [@media(max-height:760px)]:py-2 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 font-bold text-lg rounded-xl transition-colors'
export const ruleTitleCls = 'text-gray-900 font-extrabold text-3xl [@media(max-height:760px)]:text-2xl'

/** SVG filter that wobbles lines slightly so a drawing reads as pen-drawn. Use as filter="url(#id)". */
export function PenFilter({ id }: { id: string }) {
  return (
    <>
      <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} />
        <feDisplacementMap in="SourceGraphic" scale={3.5} />
      </filter>
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M1 1 L9 5 L1 9" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </>
  )
}

export interface InstructionsPageProps {
  title: string
  onBack?: (e: React.MouseEvent) => void
  onRecordScore: () => void
  onOpenSettings?: () => void
  headerExtra?: ReactNode
}

/**
 * How-to-play page for a physical game (Human Bingo scoring-page layout): header with
 * บันทึกคะแนน, a drawing + numbered steps on the left, rules and a helper card on the right.
 */
export default function InstructionsShell({ title, onBack, onRecordScore, onOpenSettings, headerExtra, heading, subtitle, drawing, steps, rules, helper }: InstructionsPageProps & {
  heading: string
  subtitle: string
  drawing: ReactNode
  steps: string[]
  rules: ReactNode
  helper: ReactNode
}) {
  const [uiScale, setUiScale] = useState(1.0)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-orange-50" style={zoomFit(uiScale)}>
      <div className="flex-shrink-0 flex items-center gap-2 px-6 py-4 bg-white border-b border-orange-100 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-1 px-3 h-9 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50 transition-colors text-sm flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="text-gray-900 font-bold text-xl mx-auto">{title}</h1>
        {headerExtra}
        <button onClick={onRecordScore}
          className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-bold text-white bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-[0_3px_10px_rgba(194,65,12,0.3)] transition-all flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
            <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
            <path d="M12 14v3M8.5 20h7M9.5 20l.5-3h4l.5 3" />
          </svg>
          บันทึกคะแนน
        </button>
        <GameMenu uiScale={uiScale} onScaleChange={setUiScale} onOpenSettings={onOpenSettings} />
      </div>

      <div className="flex-1 min-h-0 flex gap-6 p-4">
        {/* Left: how to play drawing + steps */}
        <div className={`flex-1 min-w-0 flex flex-col gap-4 ${cardCls}`}>
          <div>
            <h2 className={ruleTitleCls}>{heading}</h2>
            <p className="text-gray-500 text-lg">{subtitle}</p>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center">{drawing}</div>
          <div className="flex-shrink-0 grid gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((text, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 [@media(max-height:760px)]:py-2">
                <span className="w-9 h-9 rounded-full bg-orange-500 text-white font-extrabold text-lg flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <span className="text-gray-800 font-semibold text-base leading-tight">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: scoring rules + helper (calculator) */}
        <div className="w-[clamp(20rem,32vw,30rem)] flex-shrink-0 flex flex-col gap-4 min-h-0">
          <div className={`flex-1 min-h-0 flex flex-col justify-around gap-4 [@media(max-height:760px)]:gap-2 ${cardCls}`}>
            <h2 className={ruleTitleCls}>กติกาการนับคะแนน</h2>
            {rules}
          </div>
          <div className={`flex-shrink-0 space-y-3 [@media(max-height:760px)]:space-y-1.5 ${cardCls}`}>{helper}</div>
        </div>
      </div>
    </div>
  )
}
