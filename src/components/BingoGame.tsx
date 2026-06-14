'use client'

import { useState, useCallback } from 'react'
import { Game } from '@/lib/types'
import { useStore } from '@/lib/store'
import { generateBingoCard, checkNewBingo } from '@/lib/bingo'
import { Team } from '@/lib/types'
import Link from 'next/link'

// Tailwind color → hex mapping for PDF (only the ones used by TEAM_COLORS)
const COLOR_HEX: Record<string, string> = {
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16',
  'bg-green-500': '#22c55e',
  'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4',
  'bg-blue-500': '#3b82f6',
  'bg-indigo-500': '#6366f1',
  'bg-purple-500': '#a855f7',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
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
      page-break-after:always;
      width:100%;height:100vh;
      display:flex;flex-direction:column;justify-content:center;
      font-family:'Noto Sans Thai',Sarabun,sans-serif;
      padding:8mm;box-sizing:border-box;
    ">
      <!-- Header: game name + name blank -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6mm;">
        <span style="font-size:22px;font-weight:700;color:#111827">${gameName}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:15px;color:#6b7280;">ทีม</span>
          <div style="width:120px;border-bottom:2px solid #374151;"></div>
        </div>
      </div>
      <!-- Grid -->
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
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#fff}
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
  const { teams, scores, addScore } = useStore()
  const keywords = game.bingoKeywords ?? []

  const [phase, setPhase] = useState<Phase>('cards')
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0)

  // Score config
  const [pointPerKeyword, setPointPerKeyword] = useState(1)
  const [bonusPerBingo, setBonusPerBingo] = useState(5)

  // Playing phase state
  const [calledKeywords, setCalledKeywords] = useState<string[]>([])
  const [overlayKeyword, setOverlayKeyword] = useState<string | null>(null)
  const [bingoTeam, setBingoTeam] = useState<string | null>(null)
  const [completedLines, setCompletedLines] = useState<Map<string, Set<string>>>(new Map())

  const selectedTeam = teams[selectedTeamIdx] ?? teams[0]

  const drawKeyword = useCallback(() => {
    const remaining = keywords.filter((k) => !calledKeywords.includes(k))
    if (remaining.length === 0) return
    const pick = remaining[Math.floor(Math.random() * remaining.length)]
    setOverlayKeyword(pick)
    setTimeout(() => {
      setOverlayKeyword(null)
      setCalledKeywords((prev) => {
        const newCalled = [...prev, pick]
        const newCalledSet = new Set(newCalled)

        // Auto-scoring: award points to each team
        let firstBingoTeamName: string | null = null
        setCompletedLines((prevLines) => {
          const updatedLines = new Map(prevLines)
          for (const team of teams) {
            const card = generateBingoCard(keywords, team.id)
            // Award point if keyword is in this team's card
            if (card.includes(pick)) {
              const existing = scores.find((s) => s.teamId === team.id && s.gameId === game.id)
              addScore({ teamId: team.id, gameId: game.id, points: (existing?.points ?? 0) + pointPerKeyword })
            }
            // Check for new bingo line
            const teamLines = updatedLines.get(team.id) ?? new Set<string>()
            const line = checkNewBingo(newCalledSet, card)
            if (line) {
              const lineKey = line.join(',')
              if (!teamLines.has(lineKey)) {
                teamLines.add(lineKey)
                // Award bonus
                const existing = scores.find((s) => s.teamId === team.id && s.gameId === game.id)
                // Points already updated above if card contains pick; re-read from scores won't reflect
                // the update yet (state async), so we compute on top of what we just set
                const basePoints = (existing?.points ?? 0) + (card.includes(pick) ? pointPerKeyword : 0)
                addScore({ teamId: team.id, gameId: game.id, points: basePoints + bonusPerBingo })
                if (!firstBingoTeamName) firstBingoTeamName = team.name
              }
            }
            updatedLines.set(team.id, teamLines)
          }
          return updatedLines
        })

        if (firstBingoTeamName) {
          setBingoTeam(firstBingoTeamName)
          setTimeout(() => setBingoTeam(null), 2000)
        }

        return newCalled
      })
    }, 2000)
  }, [keywords, calledKeywords, teams, scores, game.id, pointPerKeyword, bonusPerBingo, addScore])

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
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="text-white/70 hover:text-white text-sm flex-shrink-0">
              ← กลับ
            </Link>
            <h1 className="text-white font-bold text-lg flex-shrink-0">{game.icon} {game.name}</h1>
            {/* Export PDF */}
            <button
              onClick={() => exportAllCardsToPDF(teams, keywords, game.name)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors flex-shrink-0"
              title="Export ทุกทีมเป็น PDF สำหรับพิมพ์"
            >
              🖨️ Print PDF
            </button>
            {/* Team nav inline */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setSelectedTeamIdx((i) => (i - 1 + teams.length) % teams.length)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors"
              >←</button>
              {selectedTeam && (
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${selectedTeam.color}`} />
                  <span className="text-white font-semibold text-sm whitespace-nowrap">{selectedTeam.name}</span>
                </div>
              )}
              <button
                onClick={() => setSelectedTeamIdx((i) => (i + 1) % teams.length)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors"
              >→</button>
            </div>
          </div>

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

          {/* Score config */}
          <div className="flex items-center gap-4 justify-center bg-white/10 border border-white/20 rounded-xl px-4 py-2">
            <label className="text-white/80 text-sm flex items-center gap-2">
              คะแนนต่อคำ:
              <input
                type="number"
                min={0}
                value={pointPerKeyword}
                onChange={(e) => setPointPerKeyword(Number(e.target.value))}
                className="w-14 text-center bg-white/20 text-white rounded-lg border border-white/30 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-white/80 text-sm flex items-center gap-2">
              โบนัส Bingo:
              <input
                type="number"
                min={0}
                value={bonusPerBingo}
                onChange={(e) => setBonusPerBingo(Number(e.target.value))}
                className="w-14 text-center bg-white/20 text-white rounded-lg border border-white/30 px-2 py-1 text-sm"
              />
            </label>
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

      {/* Bingo overlay */}
      {bingoTeam && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="bg-yellow-400 rounded-3xl px-12 py-8 text-4xl font-extrabold text-gray-900 text-center max-w-lg">
            🎉 BINGO! {bingoTeam}
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

        {/* Live scoreboard */}
        {teams.length > 0 && (
          <div className="flex-shrink-0 flex flex-wrap gap-2 bg-black/20 rounded-xl px-3 py-2">
            {teams.map((team) => {
              const pts = scores.find((s) => s.teamId === team.id && s.gameId === game.id)?.points ?? 0
              return (
                <div key={team.id} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${team.color}`} />
                  <span className="text-white/80 text-xs">{team.name}</span>
                  <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[24px] text-center">{pts}</span>
                </div>
              )
            })}
          </div>
        )}

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
