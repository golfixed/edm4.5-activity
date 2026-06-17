'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, getTotalScore, getRankedTeams, getGameRank, getGameRankPoints, defaultRankBonuses } from '@/lib/store'
import Link from 'next/link'

export default function ScoreboardPage() {
  const router = useRouter()
  const state = useStore()
  const [view, setView] = useState<'podium' | 'list'>('podium')
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
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border border-white/30">
            <button
              onClick={() => setView('podium')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${view === 'podium' ? 'bg-white text-school-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              🏆 Podium
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${view === 'list' ? 'bg-white text-school-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              📋 List
            </button>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            กลับ
          </Link>
        </div>
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

      {/* Podium top 3 */}
      {view === 'podium' && ranked.length >= 1 && (
        <div className="px-10 pt-4 pb-2 flex items-end justify-center gap-6">
          {/* 2nd place */}
          {ranked[1] && (() => {
            const team = ranked[1]
            const total = getTotalScore(state, team.id)
            return (
              <div className="flex flex-col items-center gap-2 flex-1 max-w-xs">
                <span className="text-4xl">🥈</span>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex-shrink-0 ${team.color}`} />
                  <span className="font-extrabold text-gray-900 text-2xl">{team.name}</span>
                </div>
                {team.captain && <span className="text-gray-400 text-sm">({team.captain})</span>}
                <div className="flex gap-3 flex-wrap justify-center">
                  {games.map((g) => {
                    const rank = getGameRank(state, g.id, team.id)
                    const rp = getGameRankPoints(state, g.id, team.id)
                    const weighted = Math.round(rp * (g.weight ?? 100) / 100)
                    return (
                      <span key={g.id} className="text-sm text-gray-500">
                        {g.name}: <span className="font-bold text-gray-800">{rank !== null ? `${weighted} pt.` : '—'}</span>
                      </span>
                    )
                  })}
                </div>
                <div className="bg-slate-200 rounded-2xl w-full flex flex-col items-center py-5 shadow-md border border-slate-300" style={{ minHeight: '7rem' }}>
                  <span className="font-black tabular-nums text-school-primary" style={{ fontSize: '2.8rem' }}>{total}</span>
                  <span className="text-school-primary/60 text-base font-semibold">pt.</span>
                </div>
              </div>
            )
          })()}

          {/* 1st place */}
          {ranked[0] && (() => {
            const team = ranked[0]
            const total = getTotalScore(state, team.id)
            return (
              <div className="flex flex-col items-center gap-2 flex-1 max-w-xs">
                <span className="text-5xl">👑</span>
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex-shrink-0 ${team.color}`} />
                  <span className="font-extrabold text-gray-900 text-3xl">{team.name}</span>
                </div>
                {team.captain && <span className="text-gray-400 text-sm">({team.captain})</span>}
                <div className="flex gap-3 flex-wrap justify-center">
                  {games.map((g) => {
                    const rank = getGameRank(state, g.id, team.id)
                    const rp = getGameRankPoints(state, g.id, team.id)
                    const weighted = Math.round(rp * (g.weight ?? 100) / 100)
                    return (
                      <span key={g.id} className="text-sm text-gray-500">
                        {g.name}: <span className="font-bold text-gray-800">{rank !== null ? `${weighted} pt.` : '—'}</span>
                      </span>
                    )
                  })}
                </div>
                <div className="bg-yellow-100 rounded-2xl w-full flex flex-col items-center py-7 shadow-lg border-2 border-yellow-400" style={{ minHeight: '9rem' }}>
                  <span className="font-black tabular-nums text-school-primary" style={{ fontSize: '3.6rem' }}>{total}</span>
                  <span className="text-school-primary/60 text-base font-semibold">pt.</span>
                </div>
              </div>
            )
          })()}

          {/* 3rd place */}
          {ranked[2] && (() => {
            const team = ranked[2]
            const total = getTotalScore(state, team.id)
            return (
              <div className="flex flex-col items-center gap-2 flex-1 max-w-xs">
                <span className="text-4xl">🥉</span>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex-shrink-0 ${team.color}`} />
                  <span className="font-extrabold text-gray-900 text-2xl">{team.name}</span>
                </div>
                {team.captain && <span className="text-gray-400 text-sm">({team.captain})</span>}
                <div className="flex gap-3 flex-wrap justify-center">
                  {games.map((g) => {
                    const rank = getGameRank(state, g.id, team.id)
                    const rp = getGameRankPoints(state, g.id, team.id)
                    const weighted = Math.round(rp * (g.weight ?? 100) / 100)
                    return (
                      <span key={g.id} className="text-sm text-gray-500">
                        {g.name}: <span className="font-bold text-gray-800">{rank !== null ? `${weighted} pt.` : '—'}</span>
                      </span>
                    )
                  })}
                </div>
                <div className="bg-amber-100 rounded-2xl w-full flex flex-col items-center py-5 shadow-md border border-amber-300" style={{ minHeight: '7rem' }}>
                  <span className="font-black tabular-nums text-school-primary" style={{ fontSize: '2.8rem' }}>{total}</span>
                  <span className="text-school-primary/60 text-base font-semibold">pt.</span>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Rows rank 4+ (podium) or all (list) */}
      <div className="px-10 pb-8 space-y-2 overflow-auto">
        {(view === 'list' ? ranked : ranked.slice(3)).map((team, i) => {
          const idx = view === 'list' ? i : i + 3
          const total = getTotalScore(state, team.id)
          const { icon, cls, row } = rankDisplay(idx + 1)
          return (
            <div
              key={team.id}
              className={`rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm ${row}`}
            >
              <span className={`font-extrabold text-center flex-shrink-0 w-16 ${cls}`} style={{ fontSize: '1.6rem' }}>
                {icon}
              </span>
              <span className={`rounded-full flex-shrink-0 w-4 h-4 ${team.color}`} />
              <span className="flex-1 flex items-baseline gap-3 min-w-0">
                <span className="font-extrabold text-gray-900" style={{ fontSize: 'clamp(1.2rem,2vw,1.6rem)' }}>
                  {team.name}
                </span>
                {team.captain && (
                  <span className="text-gray-400 font-normal" style={{ fontSize: '0.9rem' }}>({team.captain})</span>
                )}
              </span>
              {games.map((g) => {
                const rank = getGameRank(state, g.id, team.id)
                const rp = getGameRankPoints(state, g.id, team.id)
                const weighted = Math.round(rp * (g.weight ?? 100) / 100)
                return (
                  <div key={g.id} className="w-36 text-center">
                    {rank !== null ? (
                      <span>
                        <span className="font-bold tabular-nums text-gray-900" style={{ fontSize: '1.4rem' }}>{weighted}</span>
                        <span className="text-gray-500 tabular-nums ml-1" style={{ fontSize: '0.9rem' }}>pt.</span>
                      </span>
                    ) : (
                      <span className="text-gray-300" style={{ fontSize: '1.4rem' }}>—</span>
                    )}
                  </div>
                )
              })}
              <div className="w-32 text-center border-l border-gray-200 pl-4">
                <span className="font-black tabular-nums text-school-primary" style={{ fontSize: 'clamp(1.4rem,2.5vw,2rem)' }}>{total}</span>
                <span className="text-school-primary/50 text-sm ml-1">pt.</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
