'use client'

import { useEffect, useRef, useState } from 'react'
import { Team } from '@/lib/types'

const SPIN_TICKS = 22 // names shown per draw before it lands
const GAP_BETWEEN_DRAWS = 700 // ms pause on each drawn team before the next spin

// Tick delays that start fast and ease out, so the spinner visibly slows before landing.
const tickDelays = Array.from({ length: SPIN_TICKS }, (_, i) => 45 + Math.pow(i / (SPIN_TICKS - 1), 2.4) * 330)

function beep(ctx: AudioContext | null, freq: number, duration: number, volume = 0.18) {
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(); osc.stop(ctx.currentTime + duration)
  } catch {}
}

/**
 * Randomly draws `count` different teams with a slot-style spinner, one at a time.
 * `onPicked` gets the drawn team ids so far after each one lands.
 */
export default function TeamSpinner({ teams, onPicked }: { teams: Team[]; onPicked: (ids: string[]) => void }) {
  const [count, setCount] = useState(Math.min(2, Math.max(1, teams.length)))
  const [shown, setShown] = useState<Team | null>(null)
  const [picked, setPicked] = useState<Team[]>([])
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const audio = useRef<AudioContext | null>(null)

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    audio.current?.close().catch(() => {})
  }, [])
  useEffect(() => { setCount((c) => Math.min(Math.max(1, c), Math.max(1, teams.length))) }, [teams.length])

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }

  const spin = () => {
    if (spinning || teams.length === 0) return
    timers.current.forEach(clearTimeout); timers.current = []
    try { audio.current ??= new AudioContext() } catch {}
    const ctx = audio.current

    const pool = [...teams]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const draws = pool.slice(0, count)

    setSpinning(true); setPicked([]); setLanded(false); onPicked([])

    let t = 0
    draws.forEach((winner, d) => {
      const remaining = teams.filter((tm) => !draws.slice(0, d).includes(tm))
      let prev: Team | null = null
      tickDelays.forEach((delay, i) => {
        t += delay
        const last = i === SPIN_TICKS - 1
        let next = winner
        if (!last && remaining.length > 1) {
          do { next = remaining[Math.floor(Math.random() * remaining.length)] } while (next === prev)
        }
        prev = next
        later(() => {
          setShown(next); setLanded(false)
          if (!last) { beep(ctx, 700 + (i % 2) * 120, 0.05, 0.12); return }
          setLanded(true)
          beep(ctx, 880, 0.12); later(() => beep(ctx, 1320, 0.22), 110)
          const soFar = draws.slice(0, d + 1)
          setPicked(soFar); onPicked(soFar.map((tm) => tm.id))
          if (d === draws.length - 1) setSpinning(false)
        }, t)
      })
      t += GAP_BETWEEN_DRAWS
    })
  }

  const stepBtnCls = 'w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors flex-shrink-0 disabled:opacity-40'

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <style>{`@keyframes ts-pop { 0% { transform: scale(.92) } 60% { transform: scale(1.06) } 100% { transform: scale(1) } }`}</style>

      {/* Spinner window */}
      <div className={`relative flex-1 min-h-[150px] rounded-2xl border-2 bg-white overflow-hidden flex flex-col items-center justify-center gap-3 px-4 transition-colors ${landed ? 'border-orange-500 shadow-[0_6px_20px_rgba(194,65,12,0.18)]' : 'border-orange-100'}`}>
        {shown ? (
          <div key={landed ? `l-${shown.id}-${picked.length}` : undefined}
            className={`flex flex-col items-center gap-3 ${landed ? 'animate-[ts-pop_.35s_ease-out]' : ''}`}>
            <span className={`w-7 h-7 rounded-full ${shown.color}`} />
            <span className={`font-extrabold text-center leading-tight text-4xl ${landed ? 'text-orange-900' : 'text-gray-700'}`}>{shown.name}</span>
            {shown.captain && <span className="text-gray-400 text-base">({shown.captain})</span>}
          </div>
        ) : (
          <span className="text-gray-300 text-6xl font-extrabold">?</span>
        )}
        {count > 1 && (spinning || picked.length > 0) && (
          <span className="absolute top-3 right-3 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 tabular-nums">
            {Math.min(picked.length + (spinning && !landed ? 1 : 0), count)} / {count}
          </span>
        )}
      </div>

      {/* Drawn teams, in draw order */}
      {count > 1 && picked.length > 0 && (
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {picked.map((tm, i) => (
            <span key={tm.id} className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-white border border-orange-200 text-sm font-semibold text-gray-800">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] flex items-center justify-center tabular-nums">{i + 1}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${tm.color}`} />
              {tm.name}
            </span>
          ))}
        </div>
      )}

      {/* Count + spin */}
      <div className="flex-shrink-0 h-14 flex items-center gap-2 bg-white border border-orange-200 rounded-xl px-3">
        <span className="text-gray-500 text-sm whitespace-nowrap flex-1">จำนวนทีม</span>
        <button disabled={spinning || count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} className={stepBtnCls} title="ลดจำนวนทีม">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9" /></svg>
        </button>
        <span className="w-9 text-center font-extrabold text-orange-600 text-xl tabular-nums">{count}</span>
        <button disabled={spinning || count >= teams.length} onClick={() => setCount((c) => Math.min(teams.length, c + 1))} className={stepBtnCls} title="เพิ่มจำนวนทีม">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M3.5 8h9M8 3.5v9" /></svg>
        </button>
        <span className="text-gray-400 text-sm">ทีม</span>
      </div>
      <button
        onClick={spin}
        disabled={spinning || teams.length === 0}
        className={`flex-shrink-0 h-14 flex items-center justify-center gap-2 font-bold text-lg rounded-xl transition-all ${spinning || teams.length === 0
          ? 'bg-orange-100 text-orange-300 cursor-not-allowed'
          : 'bg-gradient-to-b from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-[0_6px_20px_rgba(194,65,12,0.35)]'}`}
      >
        <svg className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" />
        </svg>
        {spinning ? 'กำลังสุ่ม…' : picked.length > 0 ? `สุ่มใหม่ ${count} ทีม` : `สุ่ม ${count} ทีม`}
      </button>
    </div>
  )
}
