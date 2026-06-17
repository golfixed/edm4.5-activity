'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { Game, ImageSet } from '@/lib/types'
import Link from 'next/link'

interface Props {
  game: Game
}

type Phase = 'setup' | 'countdown' | 'playing' | 'scoring'

export default function SpotDifferenceGame({ game }: Props) {
  const { teams, addScore } = useStore()
  const sets = game.imageSets ?? []
  const timerSeconds = game.timerSeconds ?? 30

  const [phase, setPhase] = useState<Phase>('setup')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [customTimer, setCustomTimer] = useState(timerSeconds)
  const [timeLeft, setTimeLeft] = useState(timerSeconds)
  const [revealed, setRevealed] = useState(false)
  const [finalScores, setFinalScores] = useState<Record<string, number>>({})
  const [countdownNum, setCountdownNum] = useState(3)

  const selectedSet = sets.find((s) => s.id === selectedSetId) ?? null
  const pairs = selectedSet?.pairs ?? []
  const currentPair = pairs[currentIndex]
  const isLast = currentIndex === pairs.length - 1
  const pct = customTimer > 0 ? timeLeft / customTimer : 0
  const timerColor = pct > 0.5 ? 'bg-green-400' : pct > 0.2 ? 'bg-yellow-400' : 'bg-red-500'

  const tickAudioRef = useRef<HTMLAudioElement | null>(null)

  const playSound = (src?: string) => {
    if (!src) return
    try { const a = new Audio(src); a.play(); return a } catch {}
  }

  const playBeep = (freq = 880, duration = 0.12, type: OscillatorType = 'sine') => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.5, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start(); osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  const startTickLoop = () => {
    stopTick()
    if (!game.soundTick) return
    try {
      const a = new Audio(game.soundTick)
      a.loop = true
      a.play()
      tickAudioRef.current = a
    } catch {}
  }

  const stopTick = () => {
    if (tickAudioRef.current) {
      tickAudioRef.current.pause()
      tickAudioRef.current.currentTime = 0
      tickAudioRef.current = null
    }
  }

  // Countdown
  useEffect(() => {
    if (phase !== 'playing' || revealed || timeLeft <= 0) return
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, phase, revealed])

  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') { stopTick(); setRevealed(true) }
  }, [timeLeft, phase])

  useEffect(() => {
    if (revealed && phase === 'playing') { stopTick(); playSound(game.soundTimeUp) }
  }, [revealed])

  // Pre-game 3-2-1 countdown
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdownNum(3)
    playBeep(660, 0.15)   // beep on 3
    let n = 3
    const tick = () => {
      n -= 1
      if (n <= 0) {
        playBeep(1320, 0.3)  // high "go!" beep
        setPhase('playing')
      } else {
        playBeep(660, 0.15)  // tick beep
        setCountdownNum(n)
        setTimeout(tick, 1000)
      }
    }
    const id = setTimeout(tick, 1000)
    return () => clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'playing') {
      setCurrentIndex(0); setTimeLeft(customTimer); setRevealed(false)
      playSound(game.soundStart); startTickLoop()
    } else { stopTick() }
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    stopTick(); setTimeLeft(customTimer); setRevealed(false); startTickLoop()
  }, [currentIndex])

  const toggleTeam = (id: string) =>
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )

  const canStart = selectedTeamIds.length > 0 && (sets.length === 0 || selectedSetId !== null)

  const goNext = () => {
    if (isLast) setPhase('scoring')
    else setCurrentIndex((i) => i + 1)
  }

  const handleSave = () => {
    selectedTeamIds.forEach((teamId) =>
      addScore({ teamId, gameId: game.id, points: finalScores[teamId] ?? 0 })
    )
    setPhase('setup'); setSelectedTeamIds([]); setSelectedSetId(null); setCurrentIndex(0)
  }

  const selectedTeams = teams.filter((t) => selectedTeamIds.includes(t.id))

  // ---- SETUP ----
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-school-primary-dark flex flex-col">
        <div className="flex items-center px-6 py-3 bg-school-primary shadow gap-4">
          <Link href="/" className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            กลับ
          </Link>
          <h1 className="text-white text-xl font-bold">{game.name}</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white/10 rounded-2xl p-8 w-full max-w-2xl space-y-6">

            {/* Team selection */}
            <div>
              <h2 className="text-white text-xl font-bold mb-1">เลือกทีมที่เล่น</h2>
              <p className="text-school-accent text-sm mb-4">เลือกแล้ว {selectedTeamIds.length} ทีม</p>
              <div className="grid grid-cols-3 gap-2">
                {teams.map((team) => {
                  const selected = selectedTeamIds.includes(team.id)
                  const disabled = false
                  return (
                    <button
                      key={team.id}
                      onClick={() => toggleTeam(team.id)}
                      disabled={disabled}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all font-medium text-sm
                        ${selected ? 'border-white bg-white/20 text-white scale-105'
                          : disabled ? 'border-white/10 text-white/30 cursor-not-allowed'
                          : 'border-white/30 text-white hover:border-white/60'}`}
                    >
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${team.color}`} />
                      <span className="flex flex-col items-start leading-tight">
                        <span>{team.name}</span>
                        {team.captain && <span className="text-white/50 text-xs font-normal">({team.captain})</span>}
                      </span>
                      {selected && <span className="ml-auto text-school-accent text-xs">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Image set selection */}
            {sets.length > 0 && (
              <div>
                <h2 className="text-white text-xl font-bold mb-1">เลือกชุดภาพ</h2>
                <p className="text-school-accent text-sm mb-4">แต่ละรอบใช้คนละชุดเพื่อไม่ซ้ำกัน</p>
                <div className="grid grid-cols-2 gap-3">
                  {sets.map((set) => {
                    const selected = selectedSetId === set.id
                    return (
                      <button
                        key={set.id}
                        onClick={() => setSelectedSetId(selected ? null : set.id)}
                        className={`flex flex-col items-start px-4 py-3 rounded-xl border-2 transition-all text-left
                          ${selected
                            ? 'border-school-accent bg-school-accent/20 scale-105'
                            : 'border-white/30 hover:border-white/60'}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-white font-bold">{set.name}</span>
                          {selected && <span className="ml-auto text-school-accent text-sm">✓</span>}
                        </div>
                        <span className="text-white/50 text-xs mt-1">{set.pairs.length} โจทย์</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timer setting */}
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2">
              <span className="text-school-accent text-sm">⏱</span>
              <span className="text-white/70 text-sm">เวลาต่อข้อ:</span>
              <input
                type="number"
                min={5}
                max={300}
                value={customTimer}
                onChange={(e) => setCustomTimer(Math.max(1, Number(e.target.value)))}
                className="w-16 text-center bg-white/20 text-white font-bold rounded-lg px-2 py-1 text-sm border border-white/30 focus:outline-none focus:border-white/60"
              />
              <span className="text-white/70 text-sm">วินาที</span>
            </div>

            <button
              onClick={() => {
                if (!canStart) return
                setFinalScores(Object.fromEntries(selectedTeamIds.map((id) => [id, 0])))
                setPhase(pairs.length > 0 ? 'countdown' : 'scoring')
              }}
              disabled={!canStart}
              className="w-full py-3 bg-school-accent text-school-primary-dark font-bold text-lg rounded-xl hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sets.length > 0 && !selectedSetId
                ? '← กรุณาเลือกชุดภาพก่อน'
                : pairs.length > 0 ? '▶ เริ่มเกม' : '▶ ข้ามไปใส่คะแนน'}
            </button>
          </div>
        </div>

      </div>
    )
  }

  // ---- COUNTDOWN ----
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-school-primary-dark flex flex-col items-center justify-center">
        <div className="text-white/50 text-xl mb-6 tracking-widest uppercase">เตรียมพร้อม</div>
        <div
          key={countdownNum}
          className="text-white font-black tabular-nums select-none"
          style={{
            fontSize: 'clamp(160px, 40vw, 400px)',
            lineHeight: 1,
            textShadow: '0 0 80px rgba(149,213,178,0.6), 0 8px 32px rgba(0,0,0,0.8)',
            animation: 'countdownPop 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
          }}
        >
          {countdownNum}
        </div>
        <div className="text-school-accent/60 text-lg mt-8">{game.name}</div>
        <style>{`
          @keyframes countdownPop {
            0%   { transform: scale(1.6); opacity: 0; }
            60%  { transform: scale(0.95); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // ---- PLAYING ----
  if (phase === 'playing') {
    const correct = currentPair?.correctImage

    return (
      <div className="h-screen bg-school-primary-dark flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-school-primary shadow flex-shrink-0">
          <button onClick={() => setPhase('setup')} className="text-white hover:text-school-accent text-sm">← ยกเลิก</button>
          <div className="text-center">
            <h1 className="text-white text-lg font-bold">{game.name}</h1>
            <span className="text-school-accent text-sm">
              {selectedSet && <span className="text-white/60 mr-2">[{selectedSet.name}]</span>}
              ข้อที่ {currentIndex + 1} / {pairs.length}
            </span>
          </div>
          <div className={`text-4xl font-bold tabular-nums ${pct > 0.5 ? 'text-green-400' : pct > 0.2 ? 'text-yellow-400' : 'text-red-400'} ${timeLeft <= 5 && !revealed ? 'animate-pulse' : ''}`}>
            {revealed ? '⏰' : timeLeft}
          </div>
        </div>

        <div className="h-2 bg-white/10 flex-shrink-0">
          <div className={`h-full transition-all duration-1000 ease-linear ${timerColor}`} style={{ width: `${pct * 100}%` }} />
        </div>

        <div className="flex-1 flex gap-4 p-4 min-h-0">
          {(['A', 'B'] as const).map((side) => {
            const imgSrc = side === 'A' ? currentPair?.imageA : currentPair?.imageB
            const isCorrect = correct === side
            return (
              <div key={side} className="flex-1 flex flex-col min-w-0 min-h-0">
                <div className={`flex flex-col flex-1 min-h-0 transition-all duration-300 rounded-xl overflow-hidden ${
                  revealed && correct !== undefined
                    ? isCorrect
                      ? 'ring-4 ring-green-400 shadow-[0_0_24px_4px_rgba(74,222,128,0.5)]'
                      : 'ring-4 ring-red-400 shadow-[0_0_24px_4px_rgba(248,113,113,0.4)]'
                    : ''
                }`}>
                  {/* Reveal banner — 100px, same width as image via shared wrapper */}
                  {revealed && correct !== undefined && (
                    <div className={`flex-shrink-0 flex items-center justify-center ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`} style={{ height: 100 }}>
                      {isCorrect ? (
                        <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                          <polyline points="6,26 18,40 42,10" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
                          <line x1="8" y1="8" x2="40" y2="40" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                          <line x1="40" y1="8" x2="8" y2="40" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                  <div className="relative bg-black/30 flex-1 min-h-0">
                    {imgSrc ? (
                      <>
                        <img src={imgSrc} alt={side} className="w-full h-full object-contain block" draggable={false} />
                        {revealed && correct === undefined && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="text-white/60 text-sm">ยังไม่ได้ตั้งเฉลย</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-48 flex items-center justify-center"><span className="text-white/40">ไม่มีภาพ</span></div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-school-primary/90 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >← ก่อนหน้า</button>

          <div className="flex gap-1">
            {pairs.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentIndex ? 'bg-school-accent scale-125' : 'bg-white/30 hover:bg-white/50'}`} />
            ))}
          </div>

          {revealed ? (
            <button onClick={goNext} className="px-6 py-2 bg-school-accent text-school-primary-dark font-bold rounded-lg hover:bg-white transition-colors">
              {isLast ? 'จบเกม → ใส่คะแนน' : 'ข้อถัดไป →'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setRevealed(true)} className="px-4 py-2 bg-yellow-500/80 text-white rounded-lg hover:bg-yellow-500 text-sm font-medium">
                เฉลยก่อนเวลา
              </button>
              {!isLast && (
                <button onClick={goNext} className="px-6 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 font-medium">
                  ถัดไป →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- SCORING ----
  return (
    <div className="min-h-screen bg-school-primary-dark flex flex-col">
      <div className="flex items-center px-6 py-3 bg-school-primary shadow gap-4">
        <button onClick={() => setPhase(pairs.length > 0 ? 'playing' : 'setup')} className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            กลับ
          </button>
        <h1 className="text-white text-xl font-bold">บันทึกคะแนน — {game.name}</h1>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white/10 rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-white text-2xl font-bold mb-2 text-center">ใส่คะแนนแต่ละทีม</h2>
          <p className="text-school-accent text-sm text-center mb-8">นับจากจำนวนผู้เล่นที่เหลือหรือคะแนนที่ได้</p>
          <div className="space-y-4 mb-8">
            {selectedTeams.map((team, rank) => (
              <div key={team.id} className="flex items-center gap-4">
                <span className="text-white/50 text-sm w-6 text-right">{rank + 1}.</span>
                <span className={`w-5 h-5 rounded-full flex-shrink-0 ${team.color}`} />
                <span className="text-white font-medium flex-1">
                  {team.name}
                  {team.captain && <span className="text-white/50 text-sm font-normal ml-1">({team.captain})</span>}
                </span>
                <input
                  type="number" min="0"
                  value={finalScores[team.id] ?? 0}
                  onChange={(e) => setFinalScores((prev) => ({ ...prev, [team.id]: parseInt(e.target.value) || 0 }))}
                  className="w-24 px-3 py-2 rounded-lg bg-white/20 text-white text-center text-xl font-bold border border-white/30 focus:outline-none focus:border-school-accent"
                />
                <span className="text-school-accent text-sm w-12">คะแนน</span>
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="w-full py-3 bg-school-accent text-school-primary-dark font-bold text-lg rounded-xl hover:bg-white transition-colors">
            บันทึกคะแนน ✓
          </button>
        </div>
      </div>
    </div>
  )
}
