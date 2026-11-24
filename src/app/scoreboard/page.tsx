'use client'

import { useEffect, useId, useState } from 'react'
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

  const segBtn = (active: boolean) =>
    `px-4 py-1.5 text-sm font-semibold transition-colors ${active
      ? 'bg-gradient-to-b from-orange-500 to-red-600 text-white'
      : 'bg-white text-orange-700 hover:bg-orange-50'}`

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-orange-50">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-orange-100 shadow-sm flex-shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          กลับ
        </button>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" /><path d="M12 14v3M8.5 20h7M9.5 20l.5-3h4l.5 3" />
          </svg>
          ตารางคะแนน
        </h1>
        <div className="flex rounded-lg overflow-hidden border border-orange-200 shadow-sm">
          <button onClick={() => setView('podium')} className={segBtn(view === 'podium')}>Podium</button>
          <button onClick={() => setView('list')} className={`${segBtn(view === 'list')} border-l border-orange-200`}>List</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">

        {/* Podium top 3 */}
        {view === 'podium' && ranked.length >= 1 && (
          <div className="flex items-end justify-center gap-4 pt-2">
            {ranked[1] && <PodiumCard state={state} team={ranked[1]} games={games} rank={2} />}
            {ranked[0] && <PodiumCard state={state} team={ranked[0]} games={games} rank={1} />}
            {ranked[2] && <PodiumCard state={state} team={ranked[2]} games={games} rank={3} />}
          </div>
        )}

        {/* Column headers */}
        {(view === 'list' || (view === 'podium' && ranked.length > 3)) && (
          <div className={`flex items-center gap-3 px-4 ${view === 'podium' ? 'mt-4' : ''}`}>
            <span className="w-10 text-center text-xs font-bold uppercase tracking-wider text-orange-900/40">#</span>
            <span className="w-4 flex-shrink-0" />
            <span className="flex-1 text-xs font-bold uppercase tracking-wider text-orange-900/40">ทีม</span>
            {games.map(g => (
              <span key={g.id} className="w-24 text-center text-xs font-bold uppercase tracking-wider text-orange-900/40 leading-tight">{g.name}</span>
            ))}
            <span className="w-28 text-center text-xs font-bold uppercase tracking-wider text-orange-900/40">รวม</span>
          </div>
        )}

        {/* Rows */}
        <div className="flex flex-col gap-2">
          {(view === 'list' ? ranked : ranked.slice(3)).map((team, i) => {
            const idx = view === 'list' ? i : i + 3
            const total = getTotalScore(state, team.id)
            const top = idx < 3
            return (
              <div key={team.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm ${idx === 0 ? 'bg-gradient-to-r from-orange-100 to-white border-orange-300' : top ? 'bg-white border-orange-200' : 'bg-white border-orange-100'}`}>
                <span className="w-10 flex justify-center flex-shrink-0">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold tabular-nums text-sm ${RANK_BADGE[idx] ?? 'bg-orange-50 text-orange-900/40'}`}>
                    {idx + 1}
                  </span>
                </span>
                <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${team.color}`} />
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-bold text-gray-900 text-lg">{team.name}</span>
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
                        : <span className="text-orange-200">—</span>}
                    </div>
                  )
                })}
                <div className="w-28 text-center pl-3 border-l border-orange-100">
                  <span className={`font-black tabular-nums text-2xl ${top ? 'text-orange-600' : 'text-gray-900'}`}>{total}</span>
                  <span className="text-xs text-gray-400 ml-1">pt</span>
                </div>
              </div>
            )
          })}
        </div>

        {ranked.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <svg className="w-16 h-16 text-orange-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" /><path d="M12 14v3M8.5 20h7M9.5 20l.5-3h4l.5 3" />
            </svg>
            <p className="text-orange-900/40">ยังไม่มีคะแนน</p>
          </div>
        )}
      </div>
    </div>
  )
}

const RANK_BADGE: Record<number, string> = {
  0: 'bg-gradient-to-b from-orange-500 to-red-600 text-white shadow',
  1: 'bg-orange-300 text-orange-950',
  2: 'bg-orange-200 text-orange-900',
}

const PODIUM: Record<number, { height: string; block: string; number: string; label: string }> = {
  1: { height: 'h-44', block: 'bg-gradient-to-b from-orange-500 to-red-600 border-red-600 shadow-[0_10px_30px_rgba(194,65,12,0.35)]', number: 'text-white text-6xl', label: 'text-white/80' },
  2: { height: 'h-32', block: 'bg-gradient-to-b from-orange-200 to-orange-300 border-orange-300', number: 'text-orange-950 text-5xl', label: 'text-orange-900/60' },
  3: { height: 'h-24', block: 'bg-gradient-to-b from-orange-100 to-orange-200 border-orange-200', number: 'text-orange-900 text-5xl', label: 'text-orange-900/50' },
}

function PodiumCard({ state, team, games, rank }: { state: GameState; team: Team; games: Game[]; rank: number }) {
  const total = getTotalScore(state, team.id)
  const isFirst = rank === 1
  const p = PODIUM[rank]
  return (
    <div className="flex flex-col items-center gap-2 flex-1 max-w-xs">
      {isFirst ? <CrownGlyph className="w-16 h-14 drop-shadow-[0_4px_10px_rgba(194,65,12,0.35)]" /> : <MedalGlyph rank={rank} className="w-10 h-14 drop-shadow-[0_3px_6px_rgba(194,65,12,0.25)]" />}
      <div className="flex items-center gap-2">
        <span className={`rounded-full flex-shrink-0 ${team.color}`} style={{ width: isFirst ? 16 : 12, height: isFirst ? 16 : 12 }} />
        <span className="font-extrabold text-gray-900" style={{ fontSize: isFirst ? '1.5rem' : '1.1rem' }}>{team.name}</span>
      </div>
      {team.captain && <span className="text-xs text-gray-400">({team.captain})</span>}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {games.map(g => {
          const rp = getGameRankPoints(state, g.id, team.id)
          const weighted = Math.round(rp * (g.weight ?? 100) / 100)
          const gRank = getGameRank(state, g.id, team.id)
          return (
            <span key={g.id} className="text-xs text-orange-900/50 bg-white border border-orange-100 rounded-full px-2 py-0.5">
              {g.name} <span className="font-bold text-orange-700">{gRank !== null ? `${weighted}` : '—'}</span>
            </span>
          )
        })}
      </div>
      <div className={`w-full rounded-t-2xl rounded-b-lg border flex flex-col items-center justify-center ${p.height} ${p.block}`}>
        <span className={`font-black tabular-nums leading-none ${p.number}`}>{total}</span>
        <span className={`text-sm font-semibold mt-1 ${p.label}`}>คะแนน</span>
      </div>
    </div>
  )
}

/** Crown for 1st place: orange→red gradient body with cream jewels. */
function CrownGlyph({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg className={className} viewBox="0 0 64 56" aria-label="อันดับ 1">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ea580c" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      {/* points */}
      <path d="M6 18 L18 32 L32 8 L46 32 L58 18 L54 44 H10 Z" fill={`url(#${id}-body)`} stroke="#9a3412" strokeWidth="1.5" strokeLinejoin="round" />
      {/* highlight */}
      <path d="M14 26 L19 33 L32 13 L28 33 Z" fill="#fff" opacity="0.22" />
      {/* tip pearls */}
      <circle cx="6" cy="17" r="4" fill="#fff7ed" stroke="#9a3412" strokeWidth="1.5" />
      <circle cx="32" cy="7" r="4.5" fill="#fff7ed" stroke="#9a3412" strokeWidth="1.5" />
      <circle cx="58" cy="17" r="4" fill="#fff7ed" stroke="#9a3412" strokeWidth="1.5" />
      {/* band */}
      <rect x="9" y="43" width="46" height="9" rx="3" fill={`url(#${id}-band)`} stroke="#9a3412" strokeWidth="1.5" />
      <circle cx="20" cy="47.5" r="2" fill="#fed7aa" />
      <circle cx="32" cy="47.5" r="2.6" fill="#fff7ed" />
      <circle cx="44" cy="47.5" r="2" fill="#fed7aa" />
      {/* center jewel */}
      <path d="M32 26 L36 31 L32 36 L28 31 Z" fill="#fff7ed" stroke="#9a3412" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

/** Ribboned medal with the rank number, in two orange tones (2nd deeper than 3rd). */
function MedalGlyph({ rank, className }: { rank: number; className?: string }) {
  const id = useId()
  const tone = rank === 2
    ? { from: '#fdba74', to: '#f97316', ring: '#c2410c', text: '#7c2d12', ribbonA: '#fb923c', ribbonB: '#ea580c' }
    : { from: '#fed7aa', to: '#fdba74', ring: '#ea580c', text: '#9a3412', ribbonA: '#fdba74', ribbonB: '#f97316' }
  return (
    <svg className={className} viewBox="0 0 40 56" aria-label={`อันดับ ${rank}`}>
      <defs>
        <linearGradient id={`${id}-disc`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone.from} />
          <stop offset="1" stopColor={tone.to} />
        </linearGradient>
      </defs>
      {/* ribbon */}
      <path d="M8 2 H17 L24 22 H15 Z" fill={tone.ribbonA} stroke={tone.ring} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M32 2 H23 L16 22 H25 Z" fill={tone.ribbonB} stroke={tone.ring} strokeWidth="1.2" strokeLinejoin="round" />
      {/* disc */}
      <circle cx="20" cy="36" r="17" fill={`url(#${id}-disc)`} stroke={tone.ring} strokeWidth="1.5" />
      <circle cx="20" cy="36" r="12.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M9 30 A12 12 0 0 1 20 22" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
      <text x="20" y="42" textAnchor="middle" fontSize="17" fontWeight="900" fill={tone.text} fontFamily="inherit">{rank}</text>
    </svg>
  )
}
