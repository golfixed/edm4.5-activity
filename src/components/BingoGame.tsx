'use client'

import { useState, useCallback } from 'react'
import { Game } from '@/lib/types'
import { useStore } from '@/lib/store'
import { generateBingoCard } from '@/lib/bingo'
import Link from 'next/link'

type Phase = 'cards' | 'playing'

export default function BingoGame({ game }: { game: Game }) {
  const { teams } = useStore()
  const keywords = game.bingoKeywords ?? []

  const [phase, setPhase] = useState<Phase>('cards')
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0)

  // Playing phase state
  const [calledKeywords, setCalledKeywords] = useState<string[]>([])
  const [overlayKeyword, setOverlayKeyword] = useState<string | null>(null)

  const selectedTeam = teams[selectedTeamIdx] ?? teams[0]

  const drawKeyword = useCallback(() => {
    const remaining = keywords.filter((k) => !calledKeywords.includes(k))
    if (remaining.length === 0) return
    const pick = remaining[Math.floor(Math.random() * remaining.length)]
    setOverlayKeyword(pick)
    setTimeout(() => {
      setOverlayKeyword(null)
      setCalledKeywords((prev) => [...prev, pick])
    }, 2000)
  }, [keywords, calledKeywords])

  const undoLast = () => {
    setCalledKeywords((prev) => prev.slice(0, -1))
  }

  const goToPlaying = () => {
    setCalledKeywords([])
    setPhase('playing')
  }

  const bgStyle = game.backgroundImage
    ? { backgroundImage: `url(${game.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}
  const bgClass = game.backgroundImage ? '' : 'bg-gradient-to-br from-gray-900 to-gray-800'

  if (phase === 'cards') {
    const card = selectedTeam ? generateBingoCard(keywords, selectedTeam.id) : []

    return (
      <div className={`h-screen flex flex-col overflow-hidden ${bgClass}`} style={bgStyle}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col h-full p-4 gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href="/" className="text-white/70 hover:text-white text-sm">
              ← กลับหน้าหลัก
            </Link>
            <h1 className="text-white font-bold text-lg">{game.icon} {game.name}</h1>
            <div className="w-24" />
          </div>

          {/* Team selector */}
          <div className="flex items-center gap-3 justify-center">
            <select
              value={selectedTeamIdx}
              onChange={(e) => setSelectedTeamIdx(Number(e.target.value))}
              className="bg-white/10 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            >
              {teams.map((t, i) => (
                <option key={t.id} value={i} className="text-black">{t.name}</option>
              ))}
            </select>
          </div>

          {/* Card header */}
          {selectedTeam && (
            <div className="flex items-center gap-2 justify-center">
              <span className={`w-4 h-4 rounded-full ${selectedTeam.color}`} />
              <span className="text-white font-semibold">{selectedTeam.name}</span>
            </div>
          )}

          {/* Bingo card */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="grid grid-cols-5 gap-1 w-full max-w-lg">
              {card.map((cell, idx) => (
                <div
                  key={idx}
                  className={`aspect-square flex items-center justify-center rounded-lg border text-center p-1 ${
                    cell === 'FREE'
                      ? 'bg-yellow-200 border-yellow-400 font-bold text-yellow-800'
                      : 'bg-white/90 border-white/50 text-gray-800'
                  }`}
                >
                  <span className="text-xs leading-tight">{cell}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation row */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setSelectedTeamIdx((i) => (i - 1 + teams.length) % teams.length)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors"
            >
              ← ทีมก่อนหน้า
            </button>
            <button
              onClick={() => setSelectedTeamIdx((i) => (i + 1) % teams.length)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors"
            >
              ทีมถัดไป →
            </button>
          </div>

          {/* CTA */}
          <button
            onClick={goToPlaying}
            className="w-full py-3 bg-school-accent hover:bg-school-accent/80 text-white font-bold text-lg rounded-xl transition-colors"
          >
            🎲 เริ่มสุ่ม Keyword
          </button>
        </div>
      </div>
    )
  }

  // Playing phase
  const remaining = keywords.filter((k) => !calledKeywords.includes(k))
  const allCalled = remaining.length === 0

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${bgClass}`} style={bgStyle}>
      <div className="absolute inset-0 bg-black/40" />

      {/* Keyword overlay */}
      {overlayKeyword && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-black/80 rounded-3xl px-12 py-8 text-4xl font-extrabold text-school-accent text-center max-w-lg">
            {overlayKeyword}
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full p-4 gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setPhase('cards')}
            className="text-white/70 hover:text-white text-sm"
          >
            🃏 ดูกระดาษ Bingo
          </button>
          <h1 className="text-white font-bold text-lg">{game.icon} {game.name}</h1>
          <span className="text-white/60 text-sm">
            เรียกไปแล้ว {calledKeywords.length} / {keywords.length}
          </span>
        </div>

        {/* Called keywords */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-wrap gap-2 content-start">
            {calledKeywords.map((kw, i) => (
              <span key={i} className="bg-green-500/80 text-white text-sm px-3 py-1 rounded-full">
                {kw}
              </span>
            ))}
            {calledKeywords.length === 0 && (
              <p className="text-white/40 text-sm">ยังไม่มี keyword ที่เรียก</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 space-y-2">
          {allCalled ? (
            <div className="text-center py-4 text-2xl font-bold text-school-accent">
              🎉 เรียกครบทุก keyword แล้ว!
            </div>
          ) : (
            <button
              onClick={drawKeyword}
              disabled={!!overlayKeyword}
              className="w-full py-4 bg-school-accent hover:bg-school-accent/80 disabled:opacity-50 text-white font-bold text-xl rounded-xl transition-colors"
            >
              🎲 สุ่ม Keyword ถัดไป
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={undoLast}
              disabled={calledKeywords.length === 0}
              className="flex-1 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white rounded-lg text-sm border border-white/20 transition-colors"
            >
              ↩ ยกเลิกล่าสุด
            </button>
            <span className="text-white/50 text-sm self-center px-2">
              เหลือ {remaining.length} keyword
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
