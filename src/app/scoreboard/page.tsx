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
    if (rank === 1) return { icon: '👑', cls: 'text-yellow-300', row: 'bg-yellow-400/20 border border-yellow-400/40' }
    if (rank === 2) return { icon: '🥈', cls: 'text-slate-200', row: 'bg-slate-300/15 border border-slate-300/30' }
    if (rank === 3) return { icon: '🥉', cls: 'text-amber-500', row: 'bg-amber-600/15 border border-amber-500/30' }
    return { icon: String(rank), cls: 'text-white/60', row: 'bg-white/5 border border-white/10' }
  }

  return (
    <div className="min-h-screen bg-school-primary-dark text-white flex flex-col" style={{ fontFamily: 'inherit' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 bg-black/30 border-b border-white/10 flex-shrink-0">
        <h1 className="text-5xl font-extrabold tracking-tight" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
          🏆 ตารางคะแนน
        </h1>
        <Link
          href="/"
          className="px-5 py-2 bg-school-primary-light rounded-xl text-base font-semibold hover:bg-school-primary transition-colors"
        >
          ← กลับหน้าหลัก
        </Link>
      </div>

      {/* Column headers */}
      <div className="px-10 pt-6 pb-2">
        <div className="flex items-center gap-4 px-6 text-school-accent text-sm font-bold uppercase tracking-widest">
          <span className="w-16 text-center">อันดับ</span>
          <span className="w-6 flex-shrink-0" />
          <span className="flex-1">ทีม</span>
          {games.map((g) => (
            <span key={g.id} className="w-28 text-center truncate">{g.name}</span>
          ))}
          <span className="w-24 text-center border-l border-white/20 pl-4">รวม</span>
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
              className={`rounded-2xl px-6 flex items-center gap-4 backdrop-blur ${row} ${isTop3 ? 'py-5' : 'py-3'}`}
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
                <span className="font-extrabold" style={{ fontSize: isTop3 ? 'clamp(1.6rem,3vw,2.4rem)' : 'clamp(1.2rem,2vw,1.6rem)' }}>
                  {team.name}
                </span>
                {team.captain && (
                  <span className="text-white/50 font-normal" style={{ fontSize: isTop3 ? '1.1rem' : '0.9rem' }}>
                    ({team.captain})
                  </span>
                )}
              </span>

              {/* Per-game scores */}
              {games.map((g) => {
                const s = state.scores.find(
                  (sc) => sc.teamId === team.id && sc.gameId === g.id
                )
                return (
                  <div key={g.id} className="w-28 text-center">
                    <span
                      className={`font-bold tabular-nums ${s ? 'text-white' : 'text-white/30'}`}
                      style={{ fontSize: isTop3 ? '1.5rem' : '1.1rem' }}
                    >
                      {s ? s.points : '—'}
                    </span>
                  </div>
                )
              })}

              {/* Total */}
              <div className="w-24 text-center border-l border-white/20 pl-4">
                <span
                  className="font-black tabular-nums text-school-accent"
                  style={{ fontSize: isTop3 ? 'clamp(2rem,4vw,3rem)' : 'clamp(1.4rem,2.5vw,2rem)' }}
                >
                  {total}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
