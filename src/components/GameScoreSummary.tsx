'use client'

import { useStore, getGameRankPoints } from '@/lib/store'
import { Game } from '@/lib/types'
import Link from 'next/link'

interface Props {
  game: Game
  onClose?: () => void
}

const PODIUM_ORDER = [1, 0, 2] // 2nd, 1st, 3rd indices
const PODIUM_ICON = ['🥈', '👑', '🥉']
const PODIUM_HEIGHT = ['h-20', 'h-32', 'h-16']
const PODIUM_BG = ['bg-slate-400/40', 'bg-yellow-400/40', 'bg-amber-600/40']

export default function GameScoreSummary({ game, onClose }: Props) {
  const state = useStore()

  const sorted = [...state.teams].sort((a, b) => {
    const aRaw = state.scores.find((s) => s.teamId === a.id && s.gameId === game.id)?.points ?? 0
    const bRaw = state.scores.find((s) => s.teamId === b.id && s.gameId === game.id)?.points ?? 0
    return bRaw - aRaw
  })

  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  return (
    <div className="min-h-screen bg-school-primary-dark flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-school-primary shadow">
        <h1 className="text-white text-xl font-bold">สรุปคะแนน — {game.name}</h1>
        {onClose ? (
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
          >
            ✕ ปิด
          </button>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
          >
            ✕ ปิด
          </Link>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-8 gap-6 overflow-auto">
        {/* Podium top 3 */}
        <div className="w-full max-w-xl">
          <div className="flex items-end justify-center gap-4">
            {PODIUM_ORDER.map((teamIdx, podiumPos) => {
              const team = top3[teamIdx]
              if (!team) return <div key={podiumPos} className="flex-1" />
              const raw = state.scores.find((s) => s.teamId === team.id && s.gameId === game.id)?.points ?? 0
              const rp = getGameRankPoints(state, game.id, team.id)
              const isFirst = podiumPos === 1
              return (
                <div key={team.id} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-3xl">{PODIUM_ICON[podiumPos]}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-full flex-shrink-0 ${team.color} ${isFirst ? 'w-4 h-4' : 'w-3 h-3'}`} />
                    <span className={`font-extrabold text-white ${isFirst ? 'text-2xl' : 'text-lg'}`}>{team.name}</span>
                  </div>
                  {team.captain && <span className="text-white/50 text-xs">({team.captain})</span>}
                  <div className={`font-black tabular-nums text-school-accent ${isFirst ? 'text-4xl' : 'text-2xl'}`}>
                    {rp} <span className="text-sm font-normal text-white/40">pt.</span>
                  </div>
                  <div className="text-white/40 text-xs mb-1">{raw} คะแนนดิบ</div>
                  <div className={`w-full rounded-t-2xl ${PODIUM_HEIGHT[podiumPos]} ${PODIUM_BG[podiumPos]}`} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Rest */}
        {rest.length > 0 && (
          <div className="w-full max-w-xl space-y-2">
            {rest.map((team, i) => {
              const raw = state.scores.find((s) => s.teamId === team.id && s.gameId === game.id)?.points ?? 0
              const rp = getGameRankPoints(state, game.id, team.id)
              return (
                <div key={team.id} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <span className="text-white/40 font-bold w-6 text-center">{i + 4}</span>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${team.color}`} />
                  <span className="flex-1 text-white font-semibold">{team.name}</span>
                  {team.captain && <span className="text-white/40 text-sm">({team.captain})</span>}
                  <span className="text-school-accent font-bold">{rp} <span className="text-xs font-normal text-white/40">pt.</span></span>
                  <span className="text-white/30 text-sm">{raw} ดิบ</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Close button */}
        <div className="w-full max-w-xl pt-2">
          {onClose ? (
            <button
              onClick={onClose}
              className="w-full py-3 bg-white/10 text-white font-bold text-lg rounded-xl hover:bg-white/20 transition-colors border border-white/20"
            >
              กลับหน้าหลักเกม
            </button>
          ) : (
            <Link
              href="/"
              className="block w-full py-3 bg-white/10 text-white font-bold text-lg rounded-xl hover:bg-white/20 transition-colors border border-white/20 text-center"
            >
              กลับหน้าหลัก
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
