'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Game, Team } from '@/lib/types'
import { useStore } from '@/lib/store'
import { generateBingoCard, BINGO_LINES } from '@/lib/bingo'
import Link from 'next/link'
import { useConfirm } from '@/components/ConfirmDialog'

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

type Phase = 'home' | 'preview' | 'playing' | 'scoring-example'

const TILE_PT = 1
const BINGO_PT = 10
const FREE_IDX = 12
// row 3 + top-left diagonal: 8 tiles, 2 bingo lines
const EXAMPLE_MARKS = [0, 6, 10, 11, 13, 14, 18, 24]

const LINE_SAMPLES: { label: string; line: number[] }[] = [
  { label: 'แนวนอน', line: BINGO_LINES[1] },
  { label: 'แนวตั้ง', line: BINGO_LINES[8] },
  { label: 'แนวทแยง', line: BINGO_LINES[11] },
]

function MiniLine({ line }: { line: number[] }) {
  return (
    <div className="grid grid-cols-5 gap-[3px] w-24 [@media(max-height:760px)]:w-16">
      {Array.from({ length: 25 }, (_, i) => (
        <div key={i} className={`aspect-square rounded-[3px] ${line.includes(i) ? 'bg-orange-500' : i === FREE_IDX ? 'bg-amber-300' : 'bg-orange-100'}`} />
      ))}
    </div>
  )
}

const cellCenter = (i: number) => ({ x: (i % 5) + 0.5, y: Math.floor(i / 5) + 0.5 })

function LineStroke({ line, width, stroke }: { line: number[]; width: number; stroke: string }) {
  const a = cellCenter(line[0])
  const b = cellCenter(line[line.length - 1])
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
}

function ScoringExample({ card }: { card: string[] }) {
  const [marked, setMarked] = useState<Set<number>>(() => new Set(EXAMPLE_MARKS))

  const toggle = (i: number) => {
    if (i === FREE_IDX) return
    setMarked(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const isOn = (i: number) => i === FREE_IDX || marked.has(i)
  const lines = BINGO_LINES.filter(line => line.every(isOn))
  const inLine = new Set(lines.flat())
  const tileCount = marked.size + 1
  const tileScore = tileCount * TILE_PT
  const bingoScore = lines.length * BINGO_PT

  return (
    <div className="flex-1 flex gap-6 min-h-0">
      <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
        <div className="flex-1 min-h-0 w-full flex items-center justify-center [container-type:size]">
          <div className="relative [container-type:inline-size]"
            style={{ width: 'min(100cqw, 100cqh)', height: 'min(100cqw, 100cqh)' }}>
            <div className="grid grid-cols-5 grid-rows-5 gap-[1%] w-full h-full">
              {card.map((cell, i) => {
                const free = i === FREE_IDX
                const cls = inLine.has(i)
                  ? 'bg-orange-500 border-orange-600 text-white'
                  : free ? 'bg-amber-200 border-amber-400 text-amber-900'
                  : marked.has(i) ? 'bg-orange-200 border-orange-300 text-orange-900'
                  : 'bg-white border-orange-100 text-gray-800 hover:border-orange-300'
                return (
                  <button key={i} onClick={() => toggle(i)}
                    className={`relative flex items-center justify-center rounded-xl border-2 text-center p-[6%] overflow-hidden transition-colors ${cls} ${free ? 'cursor-default font-bold' : 'font-medium'}`}>
                    <span className="leading-tight text-[2.6cqw]">{cell}</span>
                    {isOn(i) && (
                      <span className="absolute top-[4%] right-[6%] text-[3.2cqw] font-extrabold leading-none opacity-90">+{TILE_PT}</span>
                    )}
                  </button>
                )
              })}
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_2px_3px_rgba(124,45,18,0.35)]" viewBox="0 0 5 5" preserveAspectRatio="none">
              <defs>
                {lines.map((line, n) => (
                  <mask key={n} id={`bingo-line-${n}`} maskUnits="userSpaceOnUse" x="-1" y="-1" width="7" height="7">
                    <rect x="-1" y="-1" width="7" height="7" fill="white" />
                    <LineStroke line={line} width={0.74} stroke="black" />
                  </mask>
                ))}
              </defs>
              {lines.map((line, n) => (
                <g key={n} mask={`url(#bingo-line-${n})`}>
                  <LineStroke line={line} width={0.86} stroke="#7c2d12" />
                </g>
              ))}
            </svg>
          </div>
        </div>
        <p className="text-orange-900/50 text-base flex-shrink-0">แตะช่องเพื่อลองทำเครื่องหมาย</p>
      </div>

      <div className="w-[clamp(20rem,32vw,30rem)] flex-shrink-0 flex flex-col gap-4 min-h-0">
        <div className="flex-1 min-h-0 bg-white border border-orange-100 shadow-sm rounded-3xl p-6 [@media(max-height:760px)]:p-4 flex flex-col justify-around gap-4 [@media(max-height:760px)]:gap-2">
          <h2 className="text-gray-900 font-extrabold text-3xl [@media(max-height:760px)]:text-2xl">กติกาการนับคะแนน</h2>
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 [@media(max-height:760px)]:w-9 [@media(max-height:760px)]:h-9 rounded-xl bg-orange-200 border-2 border-orange-300 flex-shrink-0" />
            <span className="text-gray-700 text-xl flex-1">1 ช่อง</span>
            <span className="text-gray-900 font-extrabold text-2xl [@media(max-height:760px)]:text-xl whitespace-nowrap">{TILE_PT} คะแนน</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 [@media(max-height:760px)]:w-9 [@media(max-height:760px)]:h-9 rounded-xl bg-orange-500 border-2 border-orange-600 flex-shrink-0" />
            <span className="text-gray-700 text-xl flex-1 leading-tight">บิงโก<br /><span className="text-base text-gray-500">5 ช่องเรียงกัน</span></span>
            <span className="text-gray-900 font-extrabold text-2xl [@media(max-height:760px)]:text-xl whitespace-nowrap">{BINGO_PT} คะแนน</span>
          </div>
          <div className="flex justify-center gap-8 [@media(max-height:760px)]:gap-6">
            {LINE_SAMPLES.map(s => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <MiniLine line={s.line} />
                <span className="text-gray-600 text-base font-medium">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-base">ช่อง FREE ได้คะแนนเสมอ และนับรวมในแถวบิงโก</p>
        </div>

        <div className="flex-shrink-0 bg-white border border-orange-100 shadow-sm rounded-3xl p-6 [@media(max-height:760px)]:p-4 space-y-3 [@media(max-height:760px)]:space-y-1.5">
          <div className="flex justify-between text-gray-600 text-xl">
            <span>ช่อง {tileCount} × {TILE_PT}</span>
            <span className="font-bold">{tileScore}</span>
          </div>
          <div className="flex justify-between text-gray-600 text-xl">
            <span>บิงโก {lines.length} × {BINGO_PT}</span>
            <span className="font-bold">{bingoScore}</span>
          </div>
          <div className="flex justify-between items-center border-t-2 border-orange-100 pt-3">
            <span className="text-gray-900 font-extrabold text-3xl">รวม</span>
            <span className="text-orange-600 font-black text-7xl [@media(max-height:760px)]:text-5xl leading-none tabular-nums">{tileScore + bingoScore}</span>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setMarked(new Set(EXAMPLE_MARKS))}
              className="flex-1 py-3 [@media(max-height:760px)]:py-2 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 font-bold text-lg rounded-xl transition-colors">ตัวอย่าง</button>
            <button onClick={() => setMarked(new Set())}
              className="flex-1 py-3 [@media(max-height:760px)]:py-2 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 font-bold text-lg rounded-xl transition-colors">ล้าง</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function loadProgress(key: string, keywords: string[]): { calledKeywords: string[]; countdownSeconds: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null')
    return {
      // drop keywords that were removed in settings since the progress was saved
      calledKeywords: Array.isArray(raw?.calledKeywords) ? raw.calledKeywords.filter((k: string) => keywords.includes(k)) : [],
      countdownSeconds: typeof raw?.countdownSeconds === 'number' ? raw.countdownSeconds : 30,
    }
  } catch {
    return { calledKeywords: [], countdownSeconds: 30 }
  }
}

function generateRandomCards(keywords: string[], count: number): string[][] {
  return Array.from({ length: count }, (_, i) =>
    generateBingoCard(keywords, `${Date.now()}-${i}-${Math.random()}`)
  )
}

export default function BingoGame({ game, onBack, onOpenSettings }: { game: Game; onBack?: (e: React.MouseEvent) => void; onOpenSettings?: () => void }) {
  const { teams } = useStore()
  const confirm = useConfirm()
  const keywords = game.bingoKeywords ?? []

  const [phase, setPhase] = useState<Phase>('home')
  const [cardCount, setCardCount] = useState(teams.length || 12)
  const [cards, setCards] = useState<string[][]>([])
  const [previewIdx, setPreviewIdx] = useState(0)

  const progressKey = `bingo-progress:${game.id}`
  const [savedProgress] = useState(() => loadProgress(progressKey, keywords))
  const [calledKeywords, setCalledKeywords] = useState<string[]>(savedProgress.calledKeywords)
  const [overlayKeyword, setOverlayKeyword] = useState<string | null>(null)
  const [shuffleWord, setShuffleWord] = useState<string | null>(null)

  const [countdownSeconds, setCountdownSeconds] = useState(savedProgress.countdownSeconds)

  useEffect(() => {
    try {
      localStorage.setItem(progressKey, JSON.stringify({ calledKeywords, countdownSeconds }))
    } catch {}
  }, [progressKey, calledKeywords, countdownSeconds])
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

  const startGame = () => setPhase('playing')

  const restartGame = async () => {
    if (!await confirm({ title: 'เริ่มเกมใหม่ทั้งหมด?', message: `keyword ที่เรียกไปแล้ว ${calledKeywords.length} คำจะถูกล้าง`, confirmLabel: 'เริ่มใหม่', tone: 'danger' })) return
    setCalledKeywords([])
    setPhase('playing')
  }

  const startDemo = () => {
    const pool = keywords.length > 0 ? keywords : ['ตัวอย่าง Keyword']
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setDemoMode(true)
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

  const bgUrl = game.backgroundImage ? `url(${game.backgroundImage})` : undefined
  const headerCls = 'flex-shrink-0 flex items-center gap-2 px-6 py-4 bg-white border-b border-orange-100 shadow-sm'
  const titleCls = 'text-gray-900 font-bold text-xl'
  const backBtnCls = 'flex items-center gap-1 px-3 py-1.5 border border-orange-200 rounded-lg text-orange-700 hover:bg-orange-50 transition-colors text-sm flex-shrink-0'
  const outlineBtnCls = 'bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors'
  const primaryBtnCls = 'bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-[0_6px_20px_rgba(194,65,12,0.35)] transition-all'
  const barBtnCls = 'flex-shrink-0 flex items-center gap-2 px-4 font-semibold rounded-xl shadow-md whitespace-nowrap bg-white/95 backdrop-blur hover:bg-orange-50 border border-orange-200 text-orange-700 transition-colors'
  const stepBtnCls ='flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors flex-shrink-0'
  const minusIcon = <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9" /></svg>
  const plusIcon = <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9M8 3.5v9" /></svg>
  const backIcon =<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>

  // ── Home phase ───────────────────────────────────────────────────────────
  if (phase === 'home') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-orange-50">
          <div className={`${headerCls} justify-between`}>
            <button onClick={onBack} className={backBtnCls}>{backIcon}กลับ</button>
            <h1 className={titleCls}>{game.icon} {game.name}</h1>
            <button onClick={onOpenSettings} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${outlineBtnCls}`} title="ตั้งค่าเกม">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ตั้งค่า
            </button>
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
          <div className="absolute inset-x-0 bottom-0 pt-16 px-5 pb-5 bg-gradient-to-t from-white/80 via-white/40 to-transparent">
            <div className="flex items-stretch justify-center gap-3 h-14">
              <div className="flex-shrink-0 flex items-center gap-2 bg-white/95 backdrop-blur border border-orange-200 shadow-md rounded-xl px-3">
                <svg className="w-5 h-5 text-orange-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3.5h8.5a2 2 0 0 1 2 2V17" />
                  <rect x="5.5" y="6.5" width="10" height="14" rx="2" />
                  <path d="M8.5 11h4M8.5 14.5h4" />
                </svg>
                <span className="text-gray-500 text-sm whitespace-nowrap">จำนวน</span>
                <button onClick={() => setCardCount(c => Math.max(1, c - 1))}
                  className={`w-8 h-8 ${stepBtnCls}`}>{minusIcon}</button>
                <span className="text-orange-600 font-extrabold text-2xl w-9 text-center tabular-nums">{cardCount}</span>
                <button onClick={() => setCardCount(c => c + 1)}
                  className={`w-8 h-8 ${stepBtnCls}`}>{plusIcon}</button>
                <span className="text-gray-500 text-sm">แผ่น</span>
              </div>
              <button onClick={openPreview} className={barBtnCls}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
                  <path d="M3.5 9.5h17M3.5 14.5h17M9.5 3.5v17M14.5 3.5v17" strokeWidth={1.5} />
                  <rect x="10.25" y="10.25" width="3.5" height="3.5" rx=".5" fill="currentColor" stroke="none" />
                </svg>
                ตัวอย่างกระดาษ
              </button>
              <button onClick={() => setPhase('scoring-example')} className={barBtnCls}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
                  <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
                  <path d="M12 14v3M8.5 20h7M9.5 20l.5-3h4l.5 3" />
                </svg>
                การนับคะแนน
              </button>
              <button onClick={startDemo} title="ทดสอบ Countdown (10 วิ)" className={barBtnCls}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2.5 2.5M9.5 2.5h5M12 2.5V5" />
                </svg>
                ทดสอบ
              </button>
            </div>
          </div>
          <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
            <button onClick={startGame}
              className={`px-16 py-5 font-extrabold text-3xl rounded-2xl ring-4 ring-white hover:scale-105 whitespace-nowrap ${primaryBtnCls}`}
            >{calledKeywords.length > 0 ? '🎲 เล่นต่อ' : '🎲 เริ่มเกม'}</button>
            {calledKeywords.length > 0 && (
              <>
                <span className="px-3 py-1 rounded-full bg-white/90 border border-orange-200 text-orange-700 text-sm font-semibold shadow-sm">
                  เรียกไปแล้ว {calledKeywords.length} / {keywords.length} keyword
                </span>
                <button onClick={restartGame}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/95 border border-orange-200 text-orange-700 hover:bg-orange-50 text-sm font-semibold shadow-md transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />
                  </svg>
                  เริ่มเกมใหม่ทั้งหมด
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Preview phase ─────────────────────────────────────────────────────────
  if (phase === 'preview') {
    const card = cards[previewIdx] ?? []
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-orange-50">
          <div className={headerCls}>
            <button onClick={() => setPhase('home')} className={backBtnCls}>{backIcon}กลับ</button>
            <h1 className={`${titleCls} mx-auto`}>ตัวอย่างกระดาษ</h1>
            <button
              onClick={() => exportCardsDirectToPDF(cards, game.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm flex-shrink-0 ${outlineBtnCls}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 8V3.5h10V8" />
                <rect x="3.5" y="8" width="17" height="8.5" rx="2" />
                <rect x="7" y="13.5" width="10" height="7" rx="1" fill="white" />
                <path d="M17 11h.01" strokeWidth={2.5} />
              </svg>
              Print PDF
            </button>
            <button onClick={() => setPreviewIdx((i) => (i - 1 + cards.length) % cards.length)} title="แผ่นก่อนหน้า"
              className={`flex items-center justify-center w-9 h-[34px] rounded-lg flex-shrink-0 ${outlineBtnCls}`}>{backIcon}</button>
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5 text-orange-800 text-sm font-semibold whitespace-nowrap flex-shrink-0">
              แผ่น {previewIdx + 1} / {cards.length}
            </div>
            <button onClick={() => setPreviewIdx((i) => (i + 1) % cards.length)} title="แผ่นถัดไป"
              className={`flex items-center justify-center w-9 h-[34px] rounded-lg flex-shrink-0 ${outlineBtnCls}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

        <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
          <div className="flex-1 flex items-center justify-center min-h-0 [container-type:size]">
            <div className="grid grid-cols-5 grid-rows-5 gap-[1%] [container-type:inline-size]"
              style={{ width: 'min(100cqw, 100cqh)', height: 'min(100cqw, 100cqh)' }}>
              {card.map((cell, idx) => (
                <div key={idx} className={`flex items-center justify-center rounded-lg border-2 text-center p-[4%] overflow-hidden ${cell === 'FREE' ? 'bg-amber-200 border-amber-400 font-bold text-amber-900' : 'bg-white border-orange-100 text-gray-800'}`}>
                  <span className="leading-tight text-[2.6cqw]">{cell}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Scoring example phase ─────────────────────────────────────────────────
  if (phase === 'scoring-example') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-orange-50">
          <div className={headerCls}>
            <button onClick={() => setPhase('home')} className={backBtnCls}>{backIcon}กลับ</button>
            <h1 className={`${titleCls} mx-auto`}>ตัวอย่างการนับคะแนน</h1>
            <div className="w-[72px] flex-shrink-0" />
          </div>
        <div className="flex-1 min-h-0 flex flex-col p-4">
          <ScoringExample card={generateBingoCard(keywords, 'scoring-example')} />
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
    <div className="h-screen flex flex-col overflow-hidden bg-orange-50">

      {/* Shuffle animation overlay */}
      {shuffleWord && !overlayKeyword && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-12">
          <div className="font-extrabold text-orange-200 text-center leading-tight"
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
            <div className={`flex items-center gap-[0.3em] text-white font-black tracking-widest mb-4 transition-opacity ${flash ? 'opacity-100' : 'opacity-80'}`}
              style={{ fontSize: 'clamp(2rem, 6vw, 5rem)' }}>
              <svg className="w-[1em] h-[1em] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="13" r="7.5" />
                <path d="M12 9.5V13l2.5 2M5 3.5 2.5 6M19 3.5 21.5 6M6.5 19.5 5 21M17.5 19.5 19 21" />
              </svg>
              หมดเวลา!
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

          <div className={`flex items-center gap-2 text-xl ${timeUp ? 'text-white/70' : 'text-gray-400'}`}>
            แตะเพื่อถัดไป
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      )}

      <div className={`${headerCls} justify-between`}>
        <button onClick={() => setPhase('home')} className={backBtnCls}>{backIcon}กลับ</button>
        <h1 className={titleCls}>{game.icon} {game.name}</h1>
        <span className="text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 text-sm font-semibold">เรียกไปแล้ว {calledKeywords.length} / {keywords.length}</span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row p-4 gap-3 overflow-hidden">

        {/* Called keywords */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-2xl p-3 border border-orange-100 shadow-sm">
          {calledKeywords.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <svg className="w-16 h-16 text-orange-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6a1.5 1.5 0 0 1 1.06.44l6.9 6.9a1.5 1.5 0 0 1 0 2.12l-7.6 7.6a1.5 1.5 0 0 1-2.12 0l-6.9-6.9A1.5 1.5 0 0 1 3.5 12.6z" />
                <circle cx="8" cy="8" r="1.5" />
              </svg>
              <p className="text-gray-400 text-lg">ยังไม่มี keyword ที่เรียก</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 content-start">
              {calledKeywords.map((kw, i) => (
                <span key={i} className="bg-orange-100 text-orange-800 border border-orange-300 px-4 py-1.5 rounded-full font-medium" style={{ fontSize: '24px' }}>{kw}</span>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 grid grid-cols-[1fr_auto] gap-2 lg:flex lg:flex-col lg:w-80">
          {allCalled ? (
            <div className="col-span-2 text-center py-4 text-2xl font-bold text-orange-600 lg:flex-1 lg:flex lg:items-center lg:justify-center">🎉 เรียกครบทุก keyword แล้ว!</div>
          ) : (
            <>
              <button
                onClick={drawKeyword}
                className={`h-16 lg:h-auto lg:flex-1 lg:max-h-72 flex lg:flex-col items-center justify-center gap-2.5 lg:gap-3 font-bold text-xl lg:text-2xl rounded-xl lg:rounded-2xl ${primaryBtnCls}`}
              >
                <svg className="w-6 h-6 lg:w-12 lg:h-12 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                </svg>
                {calledKeywords.length === 0 ? 'เริ่ม Keyword แรก' : 'สุ่ม Keyword ถัดไป'}
              </button>
              {/* Countdown setting */}
              <div className="h-16 flex items-center justify-between gap-2 bg-white border border-orange-200 rounded-xl px-3">
                <svg className="w-7 h-7 text-orange-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2.5 2.5M9.5 2.5h5M12 2.5V5" />
                </svg>
                <button onClick={() => setCountdownSeconds(s => Math.max(0, s - 5))}
                  className={`w-9 h-9 ${stepBtnCls}`}>{minusIcon}</button>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={countdownSeconds}
                  onChange={(e) => setCountdownSeconds(Math.min(300, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-12 text-center font-extrabold text-orange-600 focus:outline-none text-2xl tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button onClick={() => setCountdownSeconds(s => Math.min(300, s + 5))}
                  className={`w-9 h-9 ${stepBtnCls}`}>{plusIcon}</button>
                <span className="text-gray-400 text-sm">วิ</span>
              </div>
            </>
          )}
          <button
            onClick={undoLast}
            disabled={calledKeywords.length === 0}
            className={`h-11 lg:mt-auto flex items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-30 ${outlineBtnCls}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14 4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
            </svg>
            ยกเลิกล่าสุด
          </button>
          <Link
            href="/admin"
            className="h-11 flex items-center justify-center gap-2 px-4 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shadow"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
            </svg>
            จบเกม
            <svg className="w-4 h-4 flex-shrink-0 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            ใส่คะแนน
          </Link>
        </div>
      </div>
    </div>
  )
}
