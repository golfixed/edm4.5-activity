'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, getTotalScore, getRankedTeams } from '@/lib/store'
import Link from 'next/link'

export default function ScoreboardPage() {
  const router = useRouter()
  const state = useStore()
  const ranked = getRankedTeams(state)
  const games = state.games

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 5000)
    return () => clearInterval(interval)
  }, [router])

  const rankDisplay = (rank: number) => {
    if (rank === 1) return { icon: '👑', cls: 'text-yellow-400' }
    if (rank === 2) return { icon: '🥈', cls: 'text-gray-300' }
    if (rank === 3) return { icon: '🥉', cls: 'text-amber-600' }
    return { icon: String(rank), cls: 'text-white' }
  }

  return (
    <div className="min-h-screen bg-school-primary-dark text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">🏆 ตารางคะแนน</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-school-primary-light rounded-lg text-sm hover:bg-school-primary transition-colors"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>

        <div className="space-y-3">
          {ranked.map((team, idx) => {
            const total = getTotalScore(state, team.id)
            const { icon, cls } = rankDisplay(idx + 1)
            return (
              <div
                key={team.id}
                className="bg-white/10 backdrop-blur rounded-2xl px-6 py-4 flex items-center gap-4"
              >
                <span className={`text-3xl font-bold w-12 text-center ${cls}`}>
                  {icon}
                </span>
                <span
                  className={`w-5 h-5 rounded-full ${team.color} flex-shrink-0`}
                />
                <span className="flex-1 text-xl font-semibold">{team.name}</span>
                <div className="flex gap-4 items-center">
                  {games.map((g) => {
                    const s = state.scores.find(
                      (sc) => sc.teamId === team.id && sc.gameId === g.id
                    )
                    return (
                      <div key={g.id} className="text-center">
                        <div className="text-xs text-school-accent">{g.name}</div>
                        <div className="text-sm font-mono">
                          {s ? s.points : '-'}
                        </div>
                      </div>
                    )
                  })}
                  <div className="text-center ml-4 border-l border-white/30 pl-4">
                    <div className="text-xs text-school-accent">รวม</div>
                    <div className="text-3xl font-bold text-school-accent">
                      {total}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
