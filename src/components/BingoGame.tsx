'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700;800&display=swap" rel="stylesheet"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#fff;font-family:'Sarabun',sans-serif}
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

// Web Audio helpers
function playTick(ctx: AudioContext, freq = 880, duration = 0.04, vol = 0.3) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = 'sine'
  gain.gain.setValueAtTime(vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start(); osc.stop(ctx.currentTime + duration)
}

function playReveal(ctx: AudioContext) {
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTick(ctx, freq, 0.3, 0.4), i * 60)
  })
}

// Returns a stop function; loops 3 descending beeps until stopped
function startTimeUpLoop(ctx: AudioContext): () => void {
  let stopped = false
  const master = ctx.createGain()
  master.gain.value = 1
  master.connect(ctx.destination)

  const pattern = [880, 660, 440]
  const beepDur = 0.22
  const gap = 0.28
  const cycleDur = (pattern.length * gap + 0.4) * 1000

  const playOnce = () => {
    if (stopped) return
    pattern.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(master)
      osc.type = 'square'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * gap
      gain.gain.setValueAtTime(0.35, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + beepDur)
      osc.start(t); osc.stop(t + beepDur)
    })
    setTimeout(playOnce, cycleDur)
  }
  playOnce()
  return () => {
    stopped = true
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.disconnect()
  }
}

function playCountdownTick(ctx: AudioContext, remaining: number) {
  if (remaining <= 0) return
  else if (remaining <= 5) {
    // Urgent: high double-beep
    playTick(ctx, 1200, 0.06, 0.5)
    setTimeout(() => playTick(ctx, 1200, 0.06, 0.5), 120)
  } else if (remaining <= 10) {
    // Warning: higher pitch
    playTick(ctx, 1000, 0.05, 0.35)
  } else {
    // Normal tick
    playTick(ctx, 700, 0.04, 0.15)
  }
}

// Export pre-generated cards directly (no team association)
function exportCardsDirectToPDF(cards: string[][], gameName: string) {
  const cardsHTML = cards.map((card) => {
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
      font-family:'Sarabun',sans-serif;padding:8mm;box-sizing:border-box;
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
    <title>${gameName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700;800&display=swap" rel="stylesheet"/>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#fff;font-family:'Sarabun',sans-serif}
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

type Phase = 'home' | 'preview' | 'playing'

function generateRandomCards(keywords: string[], count: number): string[][] {
  return Array.from({ length: count }, (_, i) =>
    generateBingoCard(keywords, `${Date.now()}-${i}-${Math.random()}`)
  )
}

export default function BingoGame({ game }: { game: Game }) {
  const { teams } = useStore()
  const keywords = game.bingoKeywords ?? []

  const [phase, setPhase] = useState<Phase>('home')
  const [cardCount, setCardCount] = useState(teams.length || 12)
  const [cards, setCards] = useState<string[][]>([])
  const [previewIdx, setPreviewIdx] = useState(0)

  const [calledKeywords, setCalledKeywords] = useState<string[]>([])
  const [overlayKeyword, setOverlayKeyword] = useState<string | null>(null)
  const [shuffleWord, setShuffleWord] = useState<string | null>(null)

  const [countdownSeconds, setCountdownSeconds] = useState(30)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [timeUp, setTimeUp] = useState(false)
  const [flash, setFlash] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flashRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeUpStopRef = useRef<(() => void) | null>(null)

  const getAudioCtx = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }

  // Countdown timer — starts when overlay appears, cleans up when it disappears
  useEffect(() => {
    const activeSecs = demoMode ? 10 : countdownSeconds
    if (overlayKeyword && activeSecs > 0) {
      setCountdown(activeSecs)
      const ctx = getAudioCtx()
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null
          const next = prev - 1
          playCountdownTick(ctx, next)
          if (next <= 0) {
            clearInterval(countdownRef.current!)
            return 0
          }
          return next
        })
      }, 1000)
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current)
      setCountdown(null)
      setTimeUp(false)
      setFlash(false)
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [overlayKeyword, demoMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // When countdown hits 0: start siren + flash; stop when timeUp clears
  useEffect(() => {
    if (timeUp) {
      const ctx = getAudioCtx()
      timeUpStopRef.current = startTimeUpLoop(ctx)
      let f = false
      flashRef.current = setInterval(() => { f = !f; setFlash(f) }, 300)
    } else {
      if (timeUpStopRef.current) { timeUpStopRef.current(); timeUpStopRef.current = null }
      if (flashRef.current) { clearInterval(flashRef.current); flashRef.current = null }
      setFlash(false)
    }
    return () => {
      if (timeUpStopRef.current) { timeUpStopRef.current(); timeUpStopRef.current = null }
      if (flashRef.current) { clearInterval(flashRef.current); flashRef.current = null }
    }
  }, [timeUp]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger timeUp when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) setTimeUp(true)
  }, [countdown])

  const openPreview = () => {
    setCards(generateRandomCards(keywords, cardCount))
    setPreviewIdx(0)
    setPhase('preview')
  }

  const startGame = () => {
    setCalledKeywords([])
    setPhase('playing')
  }

  const startDemo = () => {
    const pool = keywords.length > 0 ? keywords : ['ตัวอย่าง Keyword']
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setDemoMode(true)
    setCalledKeywords([])
    setPhase('playing')
    // slight delay so playing phase renders before overlay appears
    setTimeout(() => setOverlayKeyword(pick), 50)
  }

  const drawKeyword = useCallback(() => {
    if (overlayKeyword) {
      if (demoMode) {
        setOverlayKeyword(null)
        setDemoMode(false)
        setPhase('home')
        return
      }
      setCalledKeywords((prev) => [...prev, overlayKeyword])
      setOverlayKeyword(null)
      return
    }
    const remaining = keywords.filter((k) => !calledKeywords.includes(k))
    if (remaining.length === 0) return
    const pick = remaining[Math.floor(Math.random() * remaining.length)]

    const ctx = getAudioCtx()
    const pool = keywords.length > 1 ? keywords : [pick]
    const totalSteps = 14
    const intervals = Array.from({ length: totalSteps }, (_, i) =>
      Math.round(60 + (300 - 60) * (i / (totalSteps - 1)))
    )
    setShuffleWord(pool[Math.floor(Math.random() * pool.length)])
    let idx = 0
    const tick = () => {
      if (idx >= totalSteps) {
        setShuffleWord(null); setOverlayKeyword(pick); playReveal(ctx); return
      }
      playTick(ctx, 880 - idx * 20, 0.04, 0.25)
      setShuffleWord(pool[Math.floor(Math.random() * pool.length)])
      idx++
      setTimeout(tick, intervals[idx - 1])
    }
    setTimeout(tick, intervals[0])
  }, [keywords, calledKeywords, overlayKeyword])

  const undoLast = () => setCalledKeywords((prev) => prev.slice(0, -1))

  const bgStyle = game.backgroundImage
    ? { backgroundImage: `url(${game.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}
  const bgClass = game.backgroundImage ? '' : 'bg-gradient-to-br from-gray-900 to-gray-800'

  // ── Home phase ───────────────────────────────────────────────────────────
  if (phase === 'home') {
    return (
      <div className={`h-screen flex flex-col overflow-hidden ${bgClass}`} style={bgStyle}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              กลับ
            </Link>
            <h1 className="text-white font-bold text-xl">{game.icon} {game.name}</h1>
            <span className="w-16" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-6 py-3">
              <span className="text-white text-lg">จำนวนกระดาษ</span>
              <button onClick={() => setCardCount(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-lg transition-colors">−</button>
              <span className="text-white font-extrabold text-3xl w-12 text-center">{cardCount}</span>
              <button onClick={() => setCardCount(c => c + 1)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-lg transition-colors">+</button>
              <span className="text-white/60 text-base">แผ่น</span>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button onClick={openPreview}
                className="w-full py-5 bg-white/15 hover:bg-white/25 border-2 border-white/30 text-white font-bold text-2xl rounded-2xl transition-all"
              >🃏 แสดงตัวอย่างกระดาษ</button>
              <button onClick={startGame}
                className="w-full py-5 bg-school-accent hover:bg-school-accent/80 text-white font-bold text-2xl rounded-2xl transition-all shadow-lg"
              >🎲 เริ่มเกม</button>
              <button onClick={startDemo}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 font-semibold text-lg rounded-2xl transition-all"
              >⏱ ทดสอบ Countdown (10 วิ)</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview phase ─────────────────────────────────────────────────────────
  if (phase === 'preview') {
    const card = cards[previewIdx] ?? []
    return (
      <div className={`h-screen flex flex-col overflow-hidden ${bgClass}`} style={bgStyle}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col h-full p-4 gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setPhase('home')} className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              กลับ
            </button>
            <h1 className="text-white font-bold text-lg mx-auto">{game.icon} {game.name}</h1>
            <button
              onClick={() => exportCardsDirectToPDF(cards, game.name)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors flex-shrink-0"
            >🖨️ Print PDF</button>
            <button onClick={() => setPreviewIdx((i) => (i - 1 + cards.length) % cards.length)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors flex-shrink-0">←</button>
            <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm font-semibold whitespace-nowrap flex-shrink-0">
              แผ่น {previewIdx + 1} / {cards.length}
            </div>
            <button onClick={() => setPreviewIdx((i) => (i + 1) % cards.length)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20 transition-colors flex-shrink-0">→</button>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="grid grid-cols-5 gap-1 w-full max-w-lg">
              {card.map((cell, idx) => (
                <div key={idx} className={`aspect-square flex items-center justify-center rounded-lg border text-center p-1 ${cell === 'FREE' ? 'bg-yellow-200 border-yellow-400 font-bold text-yellow-800' : 'bg-white/90 border-white/50 text-gray-800'}`}>
                  <span className="text-xs leading-tight">{cell}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={startGame}
            className="w-full py-3 bg-school-accent hover:bg-school-accent/80 text-white font-bold text-lg rounded-xl transition-colors"
          >🎲 เริ่มเกม</button>
        </div>
      </div>
    )
  }

  // ── Playing phase ─────────────────────────────────────────────────────────
  const remaining = keywords.filter((k) => !calledKeywords.includes(k))
  const allCalled = remaining.length === 0

  const isUrgent = countdown !== null && countdown <= 5
  const isWarning = countdown !== null && countdown <= 10 && countdown > 5

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      {/* Shuffle animation overlay */}
      {shuffleWord && !overlayKeyword && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-12">
          <div className="font-extrabold text-gray-300 text-center leading-tight"
            style={{ fontSize: 'clamp(3rem, 10vw, 9rem)' }}>{shuffleWord}</div>
        </div>
      )}

      {/* Keyword overlay with countdown */}
      {overlayKeyword && (
        <div
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer p-12 transition-colors duration-150 ${
            timeUp
              ? flash ? 'bg-red-600' : 'bg-red-500'
              : isUrgent ? 'bg-red-50' : isWarning ? 'bg-orange-50' : 'bg-white'
          }`}
          onClick={drawKeyword}
        >
          {/* หมดเวลา banner */}
          {timeUp && (
            <div className={`text-white font-black tracking-widest mb-4 transition-opacity ${flash ? 'opacity-100' : 'opacity-80'}`}
              style={{ fontSize: 'clamp(2rem, 6vw, 5rem)' }}>
              ⏰ หมดเวลา!
            </div>
          )}

          <div
            className={`font-extrabold text-center leading-tight flex-1 flex items-center transition-colors duration-150 ${
              timeUp ? 'text-white' : isUrgent ? 'text-red-600' : 'text-gray-900'
            }`}
            style={{ fontSize: 'clamp(3rem, 10vw, 9rem)' }}
          >
            {overlayKeyword}
          </div>

          {/* Countdown */}
          {countdown !== null && countdownSeconds > 0 && !timeUp && (
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="w-80 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isUrgent ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${(countdown / countdownSeconds) * 100}%` }}
                />
              </div>
              <div
                className={`font-black tabular-nums transition-colors duration-300 ${
                  isUrgent ? 'text-red-600' : isWarning ? 'text-orange-500' : 'text-gray-400'
                }`}
                style={{ fontSize: isUrgent ? '3.5rem' : '2.5rem' }}
              >
                {countdown}
              </div>
            </div>
          )}

          <div className={`text-xl ${timeUp ? 'text-white/70' : 'text-gray-400'}`}>
            แตะเพื่อถัดไป →
          </div>
        </div>
      )}

      <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <button onClick={() => setPhase('home')} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              กลับ
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
                <span key={i} className="bg-green-100 text-green-800 border border-green-300 px-4 py-1.5 rounded-full font-medium" style={{ fontSize: '24px' }}>{kw}</span>
              ))
            }
          </div>
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 space-y-2">
          {allCalled ? (
            <div className="text-center py-4 text-2xl font-bold text-school-primary">🎉 เรียกครบทุก keyword แล้ว!</div>
          ) : (
            <div className="flex gap-2 items-center">
              <button
                onClick={drawKeyword}
                className="flex-1 py-4 bg-school-primary hover:bg-school-primary-dark text-white font-bold text-xl rounded-xl transition-colors shadow"
              >
                🎲 สุ่ม Keyword ถัดไป
              </button>
              {/* Countdown setting */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
                <span className="text-gray-500 text-sm">⏱</span>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={countdownSeconds}
                  onChange={(e) => setCountdownSeconds(parseInt(e.target.value) || 0)}
                  className="w-14 text-center font-bold text-gray-700 focus:outline-none text-lg"
                />
                <span className="text-gray-400 text-sm">วิ</span>
              </div>
            </div>
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
