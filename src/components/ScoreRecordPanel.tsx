'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { Game } from '@/lib/types'

/**
 * Modal for entering every team's score for one game. Starts from each team's saved score
 * for the game, and saving replaces those scores.
 */
export default function ScoreRecordPanel({ game, onClose, onSaved, quickAdd }: {
  game: Game
  onClose: () => void
  onSaved?: () => void
  quickAdd?: { label: string; points: number } // extra one-tap button per team, e.g. +5 บิงโก
}) {
  const teams = useStore((s) => s.teams)
  const addScore = useStore((s) => s.addScore)
  const [points, setPoints] = useState<Record<string, number>>(() => {
    const scores = useStore.getState().scores
    return Object.fromEntries(teams.map((t) => [t.id, scores.find((s) => s.teamId === t.id && s.gameId === game.id)?.points ?? 0]))
  })

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const change = (id: string, delta: number) => setPoints((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) + delta) }))
  const save = () => {
    teams.forEach((t) => addScore({ teamId: t.id, gameId: game.id, points: points[t.id] ?? 0 }))
    onSaved?.()
    onClose()
  }

  const stepBtnCls = 'w-10 h-10 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors flex-shrink-0 disabled:opacity-40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" className="bg-white border border-orange-100 shadow-2xl rounded-3xl w-full max-w-xl max-h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 px-8 pt-7 pb-4 border-b border-orange-100 text-center">
          <h2 className="text-gray-900 text-2xl font-bold mb-1">บันทึกคะแนน — {game.name}</h2>
          <p className="text-gray-500 text-sm">ใส่คะแนนรวมของแต่ละทีม ({teams.length} ทีม)</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 divide-y divide-orange-50">
          {teams.map((team, i) => {
            const v = points[team.id] ?? 0
            return (
              <div key={team.id} className="flex items-center gap-3 py-2.5">
                <span className="text-gray-400 text-sm w-6 text-right tabular-nums">{i + 1}.</span>
                <span className={`w-5 h-5 rounded-full flex-shrink-0 ${team.color}`} />
                <span className="text-gray-900 font-medium flex-1 min-w-0 truncate">
                  {team.name}
                  {team.captain && <span className="text-gray-400 text-sm font-normal ml-1">({team.captain})</span>}
                </span>
                {quickAdd && (
                  <button onClick={() => change(team.id, quickAdd.points)}
                    className="h-8 px-2.5 rounded-full border border-orange-200 text-orange-700 text-xs font-semibold hover:bg-orange-50 whitespace-nowrap transition-colors">
                    +{quickAdd.points} {quickAdd.label}
                  </button>
                )}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => change(team.id, -1)} disabled={v <= 0} className={stepBtnCls} title="ลดคะแนน">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9" /></svg>
                  </button>
                  <input
                    type="number" min="0" inputMode="numeric" value={v}
                    onChange={(e) => setPoints((p) => ({ ...p, [team.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                    onFocus={(e) => e.target.select()}
                    className="w-20 px-2 py-2 rounded-lg bg-orange-50 text-orange-700 text-center text-xl font-bold tabular-nums border border-orange-200 focus:outline-none focus:border-orange-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button onClick={() => change(team.id, 1)} className={stepBtnCls} title="เพิ่มคะแนน">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9M8 3.5v9" /></svg>
                  </button>
                </div>
              </div>
            )
          })}
          {teams.length === 0 && <p className="py-10 text-center text-gray-400">ยังไม่มีทีม</p>}
        </div>

        <div className="flex-shrink-0 flex gap-3 px-8 pt-4 pb-7 border-t border-orange-100">
          <button onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors">
            ยกเลิก
          </button>
          <button onClick={save} disabled={teams.length === 0}
            className="flex-1 py-3 flex items-center justify-center gap-2 font-bold text-lg rounded-xl text-white bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 shadow-[0_6px_20px_rgba(194,65,12,0.35)] transition-all disabled:opacity-40">
            <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
            บันทึกคะแนน
          </button>
        </div>
      </div>
    </div>
  )
}
