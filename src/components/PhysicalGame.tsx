'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Game } from '@/lib/types'
import Link from 'next/link'

interface Props {
  game: Game
}

export default function PhysicalGame({ game }: Props) {
  const { teams, scores, addScore } = useStore()
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id ?? '')
  const [points, setPoints] = useState(10)

  const gameScores = scores.filter((s) => s.gameId === game.id)

  const handleAddScore = (extra = 0) => {
    if (!selectedTeamId) return
    const p = extra > 0 ? extra : points
    const existing = gameScores.find((s) => s.teamId === selectedTeamId)
    addScore({ teamId: selectedTeamId, gameId: game.id, points: (existing?.points ?? 0) + p })
  }

  const bg = game.backgroundImage
    ? { backgroundImage: `url(${game.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined

  const ranked = [...teams]
    .map((t) => ({ team: t, pts: gameScores.find((s) => s.teamId === t.id)?.points ?? 0 }))
    .sort((a, b) => b.pts - a.pts)

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden relative ${!game.backgroundImage ? 'bg-gradient-to-br from-school-primary to-school-primary-dark' : ''}`}
      style={bg}
    >
      {game.backgroundImage && <div className="absolute inset-0 bg-black/50 z-0" />}

      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
          <Link href="/" className="text-white/80 hover:text-white text-sm">← กลับ</Link>
          <h1 className="text-2xl font-extrabold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
            {game.name}
          </h1>
          <span className="w-12" />
        </div>

        {/* Scoreboard — fills remaining space */}
        <div className="flex-1 min-h-0 px-4 pb-2 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(ranked.length, 6)}, 1fr)` }}
        >
          {ranked.map(({ team, pts }, idx) => {
            const isFirst = idx === 0
            return (
              <div
                key={team.id}
                className={`flex flex-col items-center justify-center rounded-2xl transition-all ${
                  isFirst ? 'bg-yellow-400/30 border-2 border-yellow-300' : 'bg-black/40 border border-white/10'
                }`}
              >
                <span className="text-white/50 text-sm mb-1">#{idx + 1}</span>
                <span className={`w-4 h-4 rounded-full ${team.color} mb-1`} />
                <span className="text-white font-semibold text-sm text-center leading-tight px-1">{team.name}</span>
                <span className={`font-black tabular-nums mt-1 ${isFirst ? 'text-yellow-300' : 'text-school-accent'}`}
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 3rem)' }}>
                  {pts}
                </span>
              </div>
            )
          })}
        </div>

        {/* Bottom input panel */}
        <div className="flex-shrink-0 p-4 pt-0">
          <div className="bg-black/60 backdrop-blur rounded-2xl px-6 py-4 flex flex-col sm:flex-row gap-4 items-center">
            <h2 className="text-white font-bold text-lg flex-shrink-0">บันทึกคะแนน</h2>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-white/10 text-white border border-white/30 rounded-lg px-3 py-2 focus:outline-none focus:border-white"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id} className="text-black">{t.name}</option>
              ))}
            </select>
            <div className="flex gap-2 items-center">
              <input
                type="number" min="0" value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 rounded-lg border border-white/30 bg-white/10 text-white text-center focus:outline-none focus:border-white"
              />
              <button onClick={() => handleAddScore()}
                className="px-4 py-2 bg-school-accent text-school-primary-dark font-bold rounded-lg hover:bg-white transition-colors whitespace-nowrap">
                + คะแนน
              </button>
            </div>
            <div className="flex gap-2">
              {[1, 5, 10, 50].map((q) => (
                <button key={q} onClick={() => handleAddScore(q)}
                  className="px-3 py-2 bg-school-primary-light/70 text-white rounded-lg hover:bg-school-primary-light font-bold">
                  +{q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
