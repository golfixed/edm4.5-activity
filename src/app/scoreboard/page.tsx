'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, getTotalScore, getRankedTeams, getGameRank, getGameRankPoints, defaultRankBonuses } from '@/lib/store'
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
    if (rank === 1) return { icon: '👑', cls: 'text-yellow-500', row: 'bg-yellow-50 border border-yellow-300' }
    if (rank === 2) return { icon: '🥈', cls: 'text-slate-500', row: 'bg-slate-50 border border-slate-300' }
    if (rank === 3) return { icon: '🥉', cls: 'text-amber-600', row: 'bg-amber-50 border border-amber-300' }
    return { icon: String(rank), cls: 'text-gray-400', row: 'bg-white border border-gray-200' }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col" style={{ fontFamily: 'inherit' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 bg-school-primary border-b border-school-primary-dark flex-shrink-0">
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          🏆 ตารางคะแนน
        </h1>
        <Link
          href="/"
          className="px-5 py-2 bg-white/20 rounded-xl text-base font-semibold text-white hover:bg-white/30 transition-colors"
        >
          ← กลับหน้าหลัก
        </Link>
      </div>

      {/* Column headers */}
      <div className="px-10 pt-6 pb-2">
        <div className="flex items-center gap-4 px-6 text-school-primary text-sm font-bold uppercase tracking-widest">
          <span className="w-16 text-center">อันดับ</span>
          <span className="w-6 flex-shrink-0" />
          <span className="flex-1">ทีม</span>
          {games.map((g) => {
            const rankPoints = state.rankBonuses?.length ? state.rankBonuses : defaultRankBonuses
            const maxRp = Math.round((rankPoints[0] ?? 10) * (g.weight ?? 100) / 100)
            return (
              <span key={g.id} className="w-36 text-center leading-tight">
                <span className="block">{g.name}</span>
                <span className="block text-school-primary/50 text-xs font-normal normal-case tracking-normal">สูงสุด {maxRp} pt.</span>
              </span>
            )
          })}
          <span className="w-32 text-center border-l border-gray-300 pl-4">Total Score Rank</span>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 px-10 pb-8 space-y-3 overflow-auto">
        {ranked.map((team, idx) => {
          const total = getTotalScore(state, team.id)
          const { icon, cls, row } = rankDisplay(idx + 1)
          const isTop3 = idx < 3
          return (
            <div
              key={team.id}
              className={`rounded-2xl px-6 flex items-center gap-4 shadow-sm ${row} ${isTop3 ? 'py-5' : 'py-3'}`}
            >
              {/* Rank */}
              <span
                className={`font-extrabold text-center flex-shrink-0 w-16 ${cls}`}
                style={{ fontSize: isTop3 ? '2.5rem' : '1.6rem' }}
              >
                {icon}
              </span>

              {/* Color dot */}
              <span className={`rounded-full flex-shrink-0 ${team.color} ${isTop3 ? 'w-6 h-6' : 'w-4 h-4'}`} />

              {/* Team name + captain */}
              <span className="flex-1 flex items-baseline gap-3 min-w-0">
                <span className="font-extrabold text-gray-900" style={{ fontSize: isTop3 ? 'clamp(1.6rem,3vw,2.4rem)' : 'clamp(1.2rem,2vw,1.6rem)' }}>
                  {team.name}
                </span>
                {team.captain && (
                  <span className="text-gray-400 font-normal" style={{ fontSize: isTop3 ? '1.1rem' : '0.9rem' }}>
                    ({team.captain})
                  </span>
                )}
              </span>

              {/* Per-game: raw score (weighted rank score) */}
              {games.map((g) => {
                const rank = getGameRank(state, g.id, team.id)
                const raw = state.scores.find((sc) => sc.teamId === team.id && sc.gameId === g.id)?.points
                const rp = getGameRankPoints(state, g.id, team.id)
                const weighted = Math.round(rp * (g.weight ?? 100) / 100)
                return (
                  <div key={g.id} className="w-36 text-center">
                    {rank !== null ? (
                      <span>
                        <span
                          className="font-bold tabular-nums text-gray-800"
                          style={{ fontSize: isTop3 ? '1.8rem' : '1.4rem' }}
                        >
                          {raw ?? 0}
                        </span>
                        <span
                          className="text-gray-400 tabular-nums ml-1"
                          style={{ fontSize: isTop3 ? '1.1rem' : '0.9rem' }}
                        >
                          ({weighted} pt.)
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-300" style={{ fontSize: isTop3 ? '1.8rem' : '1.4rem' }}>—</span>
                    )}
                  </div>
                )
              })}

              {/* Total Score Rank */}
              <div className="w-32 text-center border-l border-gray-200 pl-4">
                <span
                  className="font-black tabular-nums text-school-primary"
                  style={{ fontSize: isTop3 ? 'clamp(2rem,4vw,3rem)' : 'clamp(1.4rem,2.5vw,2rem)' }}
                >
                  {total}
                </span>
                <span className="text-school-primary/50 text-sm ml-1">pt.</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
