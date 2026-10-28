'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore, getTotalScore, getRankedTeams, getGameRank, getGameRankPoints } from '@/lib/store'
import { GameState, Team, Game } from '@/lib/types'

export default function ScoreboardPage() {
  const router = useRouter()
  const [closing, setClosing] = useState(false)
  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    if (closing) return
    setClosing(true)
    try { sessionStorage.setItem('returnFromGame', '__util_scoreboard') } catch {}
    router.push('/')
  }
  const state = useStore()
  const [view, setView] = useState<'podium' | 'list'>('podium')
  const ranked = getRankedTeams(state)
  const games = state.games

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">🏆 ตารางคะแนน</h1>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button onClick={() => setView('podium')} className="px-4 py-1.5 text-sm font-semibold transition-colors" style={{ background: view === 'podium' ? '#111827' : 'white', color: view === 'podium' ? 'white' : '#6b7280' }}>🏆 Podium</button>
          <button onClick={() => setView('list')} className="px-4 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200" style={{ background: view === 'list' ? '#111827' : 'white', color: view === 'list' ? 'white' : '#6b7280' }}>📋 List</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

        {/* Podium top 3 */}
        {view === 'podium' && ranked.length >= 1 && (
          <div className="flex items-end justify-center gap-4">
            {ranked[1] && <PodiumCard state={state} team={ranked[1]} games={games} rank={2} height="h-28" emoji="🥈" bg="bg-gray-100" />}
            {ranked[0] && <PodiumCard state={state} team={ranked[0]} games={games} rank={1} height="h-40" emoji="👑" bg="bg-amber-50" />}
            {ranked[2] && <PodiumCard state={state} team={ranked[2]} games={games} rank={3} height="h-20" emoji="🥉" bg="bg-orange-50" />}
          </div>
        )}

        {/* Column headers */}
        {(view === 'list' || (view === 'podium' && ranked.length > 3)) && (
          <div className="flex items-center gap-3 px-4">
            <span className="w-10 text-center text-xs font-bold uppercase tracking-widest text-gray-400">#</span>
            <span className="w-4 flex-shrink-0" />
            <span className="flex-1 text-xs font-bold uppercase tracking-widest text-gray-400">ทีม</span>
            {games.map(g => (
              <span key={g.id} className="w-24 text-center text-xs font-bold uppercase tracking-widest text-gray-400">{g.name}</span>
            ))}
            <span className="w-28 text-center text-xs font-bold uppercase tracking-widest text-gray-400">รวม</span>
          </div>
        )}

        {/* Rows */}
        <div className="flex flex-col gap-1">
          {(view === 'list' ? ranked : ranked.slice(3)).map((team, i) => {
            const idx = view === 'list' ? i : i + 3
            const total = getTotalScore(state, team.id)
            const medal = idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
            return (
              <div key={team.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl">
                <span className="w-10 text-center font-extrabold tabular-nums flex-shrink-0 text-gray-300" style={{ fontSize: medal ? '1.3rem' : '1rem' }}>
                  {medal ?? idx + 1}
                </span>
                <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${team.color}`} />
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900">{team.name}</span>
                  {team.captain && <span className="text-xs text-gray-400 ml-2">({team.captain})</span>}
                </span>
                {games.map(g => {
                  const rank = getGameRank(state, g.id, team.id)
                  const rp = getGameRankPoints(state, g.id, team.id)
                  const weighted = Math.round(rp * (g.weight ?? 100) / 100)
                  return (
                    <div key={g.id} className="w-24 text-center">
                      {rank !== null
                        ? <><span className="font-bold tabular-nums text-gray-800">{weighted}</span><span className="text-xs text-gray-400 ml-0.5">pt</span></>
                        : <span className="text-gray-200">—</span>}
                    </div>
                  )
                })}
                <div className="w-28 text-center pl-3 border-l border-gray-100">
                  <span className="font-black tabular-nums text-gray-900 text-xl">{total}</span>
                  <span className="text-xs text-gray-400 ml-1">pt</span>
                </div>
              </div>
            )
          })}
        </div>

        {ranked.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-20">
            <span className="text-5xl opacity-20">🏆</span>
            <p className="text-sm text-gray-400">ยังไม่มีคะแนน</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PodiumCard({ state, team, games, rank, height, emoji, bg }: {
  state: GameState; team: Team; games: Game[]; rank: number; height: string; emoji: string; bg: string
}) {
  const total = getTotalScore(state, team.id)
  const isFirst = rank === 1
  return (
    <div className="flex flex-col items-center gap-2 flex-1 max-w-xs">
      <span style={{ fontSize: isFirst ? '2.5rem' : '2rem' }}>{emoji}</span>
      <div className="flex items-center gap-2">
        <span className={`rounded-full flex-shrink-0 ${team.color}`} style={{ width: isFirst ? 16 : 12, height: isFirst ? 16 : 12 }} />
        <span className="font-extrabold text-gray-900" style={{ fontSize: isFirst ? '1.3rem' : '1rem' }}>{team.name}</span>
      </div>
      {team.captain && <span className="text-xs text-gray-400">({team.captain})</span>}
      <div className="flex gap-2 flex-wrap justify-center">
        {games.map(g => {
          const rp = getGameRankPoints(state, g.id, team.id)
          const weighted = Math.round(rp * (g.weight ?? 100) / 100)
          const gRank = getGameRank(state, g.id, team.id)
          return <span key={g.id} className="text-xs text-gray-400">{g.name}: <span className="font-semibold text-gray-600">{gRank !== null ? `${weighted}pt` : '—'}</span></span>
        })}
      </div>
      <div className={`w-full rounded-xl flex flex-col items-center justify-end ${height} ${bg} border border-gray-200 pb-4`}>
        <span className="font-black tabular-nums text-gray-900" style={{ fontSize: isFirst ? '2.8rem' : '2rem' }}>{total}</span>
        <span className="text-sm font-semibold text-gray-400">pt.</span>
      </div>
    </div>
  )
}
