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
  const [points, setPoints] = useState(1)

  const gameScores = scores.filter((s) => s.gameId === game.id)

  const handleAddScore = (extra = 0) => {
    if (!selectedTeamId) return
    const p = extra > 0 ? extra : points
    const existing = gameScores.find((s) => s.teamId === selectedTeamId)
    addScore({ teamId: selectedTeamId, gameId: game.id, points: (existing?.points ?? 0) + p })
  }

  const handleSubtractScore = (extra = 0) => {
    if (!selectedTeamId) return
    const p = extra > 0 ? extra : points
    const existing = gameScores.find((s) => s.teamId === selectedTeamId)
    const current = existing?.points ?? 0
    addScore({ teamId: selectedTeamId, gameId: game.id, points: Math.max(0, current - p) })
  }

  const bg = game.backgroundImage
    ? { backgroundImage: `url(${game.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined

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

        {/* Team grid — original order, click to select */}
        <div className="flex-1 min-h-0 px-4 pb-2 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(teams.length, 6)}, 1fr)` }}
        >
          {teams.map((team) => {
            const pts = gameScores.find((s) => s.teamId === team.id)?.points ?? 0
            const selected = selectedTeamId === team.id
            return (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`flex flex-col items-center justify-center rounded-2xl transition-all border-2 ${
                  selected
                    ? 'bg-school-accent/30 border-school-accent scale-105 shadow-lg shadow-school-accent/30'
                    : 'bg-black/40 border-white/10 hover:border-white/30'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${team.color} mb-1`} />
                <span className="text-white font-bold text-3xl text-center leading-tight px-1">{team.name}</span>
                {team.captain && (
                  <span className="text-white/60 text-sm text-center leading-tight px-1">({team.captain})</span>
                )}
                <span
                  className={`font-black tabular-nums mt-1 ${selected ? 'text-school-accent' : 'text-white/80'}`}
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 3rem)' }}
                >
                  {pts}
                </span>
              </button>
            )
          })}
        </div>

        {/* Bottom input panel */}
        <div className="flex-shrink-0 p-4 pt-0">
          <div className="bg-black/60 backdrop-blur rounded-2xl px-4 py-4 flex flex-col sm:flex-row gap-3 items-center">
            <h2 className="text-white font-bold text-lg flex-shrink-0">บันทึกคะแนน</h2>
            {/* Input + custom score buttons */}
            <div className="flex gap-2 items-center">
              <input
                type="number" min="0" value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 rounded-lg border border-white/30 bg-white/10 text-white text-center focus:outline-none focus:border-white"
              />
              <button
                onClick={() => handleAddScore()}
                disabled={!selectedTeamId}
                className="px-4 py-2 bg-school-accent text-school-primary-dark font-bold rounded-lg hover:bg-white transition-colors whitespace-nowrap disabled:opacity-40"
              >
                + คะแนน
              </button>
              <button
                onClick={() => handleSubtractScore()}
                disabled={!selectedTeamId}
                className="px-4 py-2 bg-red-500/80 text-white font-bold rounded-lg hover:bg-red-500 transition-colors whitespace-nowrap disabled:opacity-40"
              >
                − คะแนน
              </button>
            </div>
            {/* Quick add buttons (left) */}
            <div className="flex gap-2">
              {[1, 5, 10, 50].map((q) => (
                <button key={q} onClick={() => handleAddScore(q)}
                  disabled={!selectedTeamId}
                  className="px-3 py-2 bg-school-primary-light/70 text-white rounded-lg hover:bg-school-primary-light font-bold disabled:opacity-40">
                  +{q}
                </button>
              ))}
            </div>
            {/* Quick subtract buttons (right) */}
            <div className="flex gap-2">
              {[1, 5, 10, 50].map((q) => (
                <button key={q} onClick={() => handleSubtractScore(q)}
                  disabled={!selectedTeamId}
                  className="px-3 py-2 bg-red-700/60 text-white rounded-lg hover:bg-red-700/80 font-bold disabled:opacity-40">
                  −{q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
