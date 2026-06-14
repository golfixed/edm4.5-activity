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
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    teams[0]?.id ?? ''
  )
  const [points, setPoints] = useState(10)

  const gameScores = scores.filter((s) => s.gameId === game.id)

  const handleAddScore = (extra = 0) => {
    if (!selectedTeamId) return
    const p = extra > 0 ? extra : points
    const existing = gameScores.find((s) => s.teamId === selectedTeamId)
    addScore({
      teamId: selectedTeamId,
      gameId: game.id,
      points: (existing?.points ?? 0) + p,
    })
  }

  const bg = game.backgroundImage
    ? { backgroundImage: `url(${game.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined

  return (
    <div
      className={`min-h-screen flex flex-col relative ${!game.backgroundImage ? 'bg-gradient-to-br from-school-primary to-school-primary-dark' : ''}`}
      style={bg}
    >
      {/* Dark overlay for bg image */}
      {game.backgroundImage && (
        <div className="absolute inset-0 bg-black/50 z-0" />
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm">
            ← กลับ
          </Link>
          <span />
        </div>

        {/* Center: game name */}
        <div className="flex-1 flex items-center justify-center">
          <h1
            className="text-6xl md:text-8xl font-extrabold text-white text-center"
            style={{ textShadow: '0 4px 32px rgba(0,0,0,0.7)' }}
          >
            {game.name}
          </h1>
        </div>

        {/* Bottom panel */}
        <div className="p-4">
          <div className="bg-black/60 backdrop-blur rounded-2xl p-6 flex flex-col md:flex-row gap-6">
            {/* Score input */}
            <div className="flex-1 space-y-4">
              <h2 className="text-white font-bold text-xl">บันทึกคะแนน</h2>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-white/10 text-white border border-white/30 rounded-lg px-3 py-2 focus:outline-none focus:border-white"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="text-black">
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 rounded-lg border border-white/30 bg-white/10 text-white text-center focus:outline-none focus:border-white"
                />
                <button
                  onClick={() => handleAddScore()}
                  className="flex-1 px-4 py-2 bg-school-accent text-school-primary-dark font-bold rounded-lg hover:bg-white transition-colors"
                >
                  + คะแนน
                </button>
              </div>
              {/* Quick score buttons */}
              <div className="flex gap-2">
                {[1, 5, 10, 50].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAddScore(q)}
                    className="flex-1 py-2 bg-school-primary-light/70 text-white rounded-lg hover:bg-school-primary-light transition-colors font-bold"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Live mini scoreboard */}
            <div className="flex-1">
              <h2 className="text-white font-bold text-xl mb-3">คะแนนเกมนี้</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teams
                  .map((t) => ({
                    team: t,
                    pts: gameScores.find((s) => s.teamId === t.id)?.points ?? 0,
                  }))
                  .sort((a, b) => b.pts - a.pts)
                  .map(({ team, pts }) => (
                    <div
                      key={team.id}
                      className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2"
                    >
                      <span className={`w-3 h-3 rounded-full ${team.color}`} />
                      <span className="text-white flex-1 text-sm">{team.name}</span>
                      <span className="text-school-accent font-bold">{pts}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
