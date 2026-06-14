'use client'

import { useState, useCallback } from 'react'
import { Game, Team } from '@/lib/types'
import { useStore } from '@/lib/store'
import { generateBingoCard } from '@/lib/bingo'
import Link from 'next/link'

// Tailwind color → hex mapping for PDF
const COLOR_HEX: Record<string, string> = {
  'bg-red-500': '#ef4444', 'bg-orange-500': '#f97316', 'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16', 'bg-green-500': '#22c55e', 'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4', 'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1',
  'bg-purple-500': '#a855f7', 'bg-pink-500': '#ec4899', 'bg-rose-500': '#f43f5e',
}

function exportAllCardsToPDF(teams: Team[], keywords: string[], gameName: string) {
  const cardsHTML = teams.map((team) => {
    const card = generateBingoCard(keywords, team.id)
    const cells = card.map((cell) => {
      const isFree = cell === 'FREE'
      return `<div style="
        display:flex;align-items:center;justify-content:center;
        background:${isFree ? '#fef08a' : '#fff'};
        border:2px solid ${isFree ? '#ca8a04' : '#9ca3af'};
        border-radius:6px;padding:6px 4px;text-align:center;
        font-weight:${isFree ? '700' : '500'};
        color:${isFree ? '#854d0e' : '#111827'};
        font-size:20px;line-height:1.3;
      ">${cell}</div>`
    }).join('')

    return `<div style="
      page-break-after:always;width:100%;height:100vh;
      display:flex;flex-direction:column;justify-content:center;
      font-family:'Noto Sans Thai',Sarabun,sans-serif;padding:8mm;box-sizing:border-box;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6mm;">
        <span style="font-size:22px;font-weight:700;color:#111827">${gameName}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:15px;color:#6b7280;">ทีม</span>
          <div style="width:120px;border-bottom:2px solid #374151;"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;flex:1;">
        ${cells}
      </div>
    </div>`
  }).join('')

  const html = `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Bingo Cards — ${gameName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&display=swap" rel="stylesheet"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}body{background:#fff}
      @page{size:A4 landscape;margin:0}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style>
  </head><body>${cardsHTML}</body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print() }
}

type Phase = 'cards' | 'playing'

export default function BingoGame({ game }: { game: Game }) {
  const { teams } = useStore()
  const keywords = game.bingoKeywords ?? []

  const [phase, setPhase] = useState<Phase>('cards')
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0)
  const [calledKeywords, setCalledKeywords] = useState<string[]>([])
  const [overlayKeyword, setOverlayKeyword] = useState<string | null>(null)

  const selectedTeam = teams[selectedTeamIdx] ?? teams[0]

  const drawKeyword = useCallback(() => {
    // If overlay is showing, dismiss it and confirm the keyword
    if (overlayKeyword) {
      setCalledKeywords((prev) => [...prev, overlayKeyword])
      setOverlayKeyword(null)
      return
    }
    const remaining = keywords.filter((k) => !calledKeywords.includes(k))
    if (remaining.length === 0) return
    const pick = remaining[Math.floor(Math.random() * remaining.length)]
    setOverlayKeyword(pick)
  }, [keywords, calledKeywords, overlayKeyword])

  const undoLast = () => setCalledKeywords((prev) => prev.slice(0, -1))

  const bgStyle = game.backgroundImage
    ? { backgroundImage: `url(${game.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}
  const bgClass = game.backgroundImage ? '' : 'bg-gradient-to-br from-gray-900 to-gray-800'

  // ── Cards phase ──────────────────────────────────────────────────────────
  if (phase === 'cards') {
    const card = selectedTeam ? generateBingoCard(keywords, selectedTeam.id) : []

    return (
      <div className={`h-screen flex flex-col overflow-hidden ${bgClass}`} style={bgStyle}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col h-full p-4 gap-3">

          {/* Header */}
          <div className="flex items-center gap-2">
            <Link href="/" className="text-white/70 hover:text-white text-sm flex-shrink-0">← กลับ</Link>
            <h1 className="text-white font-bold text-lg flex-shrink-0 mx-auto">{game.icon} {game.name}</h1>
            <button
              onClick={() => exportAllCardsToPDF(teams, keywords, game.name)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors flex-shrink-0"
            >🖨️ Print PDF</button>
            {/* Team nav */}
            <button onClick={() => setSelectedTeamIdx((i) => (i - 1 + teams.length) % teams.length)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors flex-shrink-0">←</button>
            {selectedTeam && (
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 flex-shrink-0">
                <span className={`w-3 h-3 rounded-full ${selectedTeam.color}`} />
                <span className="text-white font-semibold text-sm whitespace-nowrap">{selectedTeam.name}</span>
              </div>
            )}
            <button onClick={() => setSelectedTeamIdx((i) => (i + 1) % teams.length)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors flex-shrink-0">→</button>
          </div>

          {/* Bingo card */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="grid grid-cols-5 gap-1 w-full max-w-lg">
              {card.map((cell, idx) => (
                <div key={idx} className={`aspect-square flex items-center justify-center rounded-lg border text-center p-1 ${
                  cell === 'FREE'
                    ? 'bg-yellow-200 border-yellow-400 font-bold text-yellow-800'
                    : 'bg-white/90 border-white/50 text-gray-800'
                }`}>
                  <span className="text-xs leading-tight">{cell}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => { setCalledKeywords([]); setPhase('playing') }}
            className="w-full py-3 bg-school-accent hover:bg-school-accent/80 text-white font-bold text-lg rounded-xl transition-colors"
          >🎲 เริ่มสุ่ม Keyword</button>
        </div>
      </div>
    )
  }

  // ── Playing phase ─────────────────────────────────────────────────────────
  const remaining = keywords.filter((k) => !calledKeywords.includes(k))
  const allCalled = remaining.length === 0

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      {/* Keyword overlay — full screen, light bg, click to proceed */}
      {overlayKeyword && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white cursor-pointer p-12"
          onClick={drawKeyword}
        >
          <div
            className="font-extrabold text-gray-900 text-center leading-tight flex-1 flex items-center"
            style={{ fontSize: 'clamp(3rem, 10vw, 9rem)' }}
          >
            {overlayKeyword}
          </div>
          <div className="text-gray-400 text-xl">แตะเพื่อถัดไป →</div>
        </div>
      )}

      <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <button onClick={() => setPhase('cards')} className="text-gray-500 hover:text-gray-800 text-sm">
            🃏 ดูกระดาษ Bingo
          </button>
          <h1 className="text-gray-800 font-bold text-lg">{game.icon} {game.name}</h1>
          <span className="text-gray-500 text-sm">เรียกไปแล้ว {calledKeywords.length} / {keywords.length}</span>
        </div>

        {/* Called keywords */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-2xl p-3 border border-gray-200">
          <div className="flex flex-wrap gap-2 content-start">
            {calledKeywords.length === 0
              ? <p className="text-gray-400 text-sm">ยังไม่มี keyword ที่เรียก</p>
              : calledKeywords.map((kw, i) => (
                  <span key={i} className="bg-green-100 text-green-800 border border-green-300 text-sm px-3 py-1 rounded-full font-medium">{kw}</span>
                ))
            }
          </div>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 space-y-2">
          {allCalled ? (
            <div className="text-center py-4 text-2xl font-bold text-school-primary">🎉 เรียกครบทุก keyword แล้ว!</div>
          ) : (
            <button
              onClick={drawKeyword}
              className="w-full py-4 bg-school-primary hover:bg-school-primary-dark text-white font-bold text-xl rounded-xl transition-colors shadow"
            >
              🎲 สุ่ม Keyword ถัดไป
            </button>
          )}
          <div className="flex gap-2 items-center">
            <button
              onClick={undoLast}
              disabled={calledKeywords.length === 0}
              className="flex-1 py-2 bg-white hover:bg-gray-100 disabled:opacity-30 text-gray-700 rounded-lg text-sm border border-gray-300 transition-colors"
            >↩ ยกเลิกล่าสุด</button>
            <span className="text-gray-400 text-sm px-2">เหลือ {remaining.length} keyword</span>
            <Link
              href="/admin"
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shadow"
            >🏁 จบเกม → ใส่คะแนน</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
