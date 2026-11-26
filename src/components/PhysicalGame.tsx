'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Game } from '@/lib/types'
import Link from 'next/link'
import AuctionPhase from './AuctionPhase'
import FishFanInstructions, { isFishFanGame } from './FishFanInstructions'
import GameMenu from './GameMenu'
import { zoomFit } from '@/lib/zoomFit'

interface Props {
  game: Game
  onBack?: (e: React.MouseEvent) => void
  onOpenSettings?: () => void
}

export default function PhysicalGame({ game, onBack, onOpenSettings }: Props) {
  const { teams, scores, addScore } = useStore()
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id ?? '')
  const [points, setPoints] = useState(1)
  const [showAuction, setShowAuction] = useState(false)
  // home = menu screen; howto = instructions page; score = team score record page
  // games with an instructions page open on it; the rest open on the home menu
  const hasHowTo = isFishFanGame(game.name)
  const [page, setPage] = useState<'home' | 'howto' | 'score'>(hasHowTo ? 'howto' : 'home')
  const [uiScale, setUiScale] = useState(1.0)

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

  const auctionItems = game.auctionItems ?? []

  if (showAuction && auctionItems.length > 0) {
    return <AuctionPhase items={auctionItems} gameName={game.name} onClose={() => setShowAuction(false)} />
  }

  if (page === 'howto' && hasHowTo) {
    return (
      <FishFanInstructions title={game.name} onBack={onBack} onRecordScore={() => setPage('score')} onOpenSettings={onOpenSettings}
        headerExtra={auctionItems.length > 0 && (
          <button onClick={() => setShowAuction(true)}
            className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50 transition-colors text-sm flex-shrink-0">
            🎁 ประมูล
          </button>
        )} />
    )
  }

  if (page === 'home') {
    const bgUrl = game.backgroundImage ? `url(${game.backgroundImage})` : undefined
    const barBtnCls = 'flex-shrink-0 flex items-center gap-2 px-5 h-14 text-lg font-semibold rounded-xl shadow-md whitespace-nowrap bg-white/95 backdrop-blur hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors'
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-orange-50" style={zoomFit(uiScale)}>
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-6 py-4 bg-white border-b border-orange-100 shadow-sm">
          <button onClick={onBack} className="flex items-center gap-1 px-3 py-1.5 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50 transition-colors text-sm flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            กลับ
          </button>
          <h1 className="text-gray-900 font-bold text-xl">{game.name}</h1>
          <GameMenu uiScale={uiScale} onScaleChange={setUiScale} onOpenSettings={onOpenSettings} />
        </div>

        <div className="relative flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-orange-50 to-orange-100">
          {bgUrl && (
            <>
              {/* blurred fill for the area the uncropped image doesn't cover */}
              <div className="absolute inset-0 scale-110 blur-2xl opacity-80"
                style={{ backgroundImage: bgUrl, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="absolute inset-0"
                style={{ backgroundImage: bgUrl, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
            </>
          )}
          <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
            <button onClick={() => setPage('score')}
              className="px-16 py-5 font-extrabold text-3xl rounded-2xl ring-4 ring-white hover:scale-105 whitespace-nowrap bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-[0_6px_20px_rgba(194,65,12,0.35)] transition-all">
              📝 บันทึกคะแนน
            </button>
          </div>
          {(hasHowTo || auctionItems.length > 0) && (
            <div className="absolute inset-x-0 bottom-0 pt-16 px-5 pb-5 bg-gradient-to-t from-white/80 via-white/40 to-transparent">
              <div className="flex items-stretch justify-center gap-3">
                {hasHowTo && (
                  <button onClick={() => setPage('howto')} className={barBtnCls}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
                      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
                    </svg>
                    วิธีเล่น
                  </button>
                )}
                {auctionItems.length > 0 && (
                  <button onClick={() => setShowAuction(true)} className={barBtnCls}>🎁 ประมูล</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
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
          <button onClick={() => setPage(hasHowTo ? 'howto' : 'home')} className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            กลับ
          </button>
          <h1 className="text-2xl font-extrabold text-white" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
            {game.name}
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={onOpenSettings} className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm" title="ตั้งค่าเกม">
              ⚙️ ตั้งค่า
            </button>
          </div>
        </div>

        {/* Team grid — original order, click to select */}
        <div className="flex-1 min-h-0 px-4 pb-2 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${teams.length <= 8 ? 4 : Math.min(teams.length, 6)}, 1fr)` }}
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
