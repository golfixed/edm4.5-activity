'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Team } from '@/lib/types'

const ITEM_H = 88 // px height of one reel row
const PAD = 3 // rows kept above/below the reel ends so neighbours always show
const REEL_ROWS = 34 // random rows a reel scrolls past before the winner
const SPIN_MS = 3200 // reel run time per draw
const GAP_BETWEEN_DRAWS = 900 // ms the drawn team stays before the next reel runs

type Row = Team | null // null = the "?" placeholder

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

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

const pickOther = (pool: Team[], avoid: Row) => {
  if (pool.length <= 1) return pool[0] ?? null
  let t: Team
  do { t = pool[Math.floor(Math.random() * pool.length)] } while (t === avoid)
  return t
}

/**
 * Slot-machine reel that randomly draws `count` different teams, one reel run per team.
 * `onPicked` gets the drawn team ids so far after each one lands.
 */
export default function TeamSpinner({ teams, onPicked }: { teams: Team[]; onPicked: (ids: string[]) => void }) {
  const [count, setCount] = useState(Math.min(2, Math.max(1, teams.length)))
  const [rows, setRows] = useState<Row[]>(() => [...Array(PAD).fill(null), null, ...Array(PAD).fill(null)])
  const [restIdx, setRestIdx] = useState(PAD)
  const [spinKey, setSpinKey] = useState(0)
  const [picked, setPicked] = useState<Team[]>([])
  const [drawNo, setDrawNo] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landed, setLanded] = useState(false)

  const stripRef = useRef<HTMLDivElement>(null)
  const audio = useRef<AudioContext | null>(null)
  const alive = useRef(true)
  const raf = useRef(0)
  const pending = useRef<{ from: number; to: number; done: () => void } | null>(null)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      cancelAnimationFrame(raf.current)
      audio.current?.close().catch(() => {})
      audio.current = null
    }
  }, [])
  useEffect(() => { setCount((c) => Math.min(Math.max(1, c), Math.max(1, teams.length))) }, [teams.length])

  // Runs the reel animation once the new rows for a draw are in the DOM.
  useLayoutEffect(() => {
    const job = pending.current
    const strip = stripRef.current
    if (!job || !strip) return
    pending.current = null
    const dist = (job.to - job.from) * ITEM_H
    const start = performance.now()
    let lastRow = job.from
    let lastY = 0
    const frame = (now: number) => {
      if (!alive.current) return
      const t = Math.min(1, (now - start) / SPIN_MS)
      const y = dist * easeOutQuint(t)
      const speed = Math.abs(y - lastY); lastY = y
      strip.style.transform = `translateY(${-(job.from * ITEM_H + y)}px)`
      strip.style.filter = speed > 6 ? `blur(${Math.min(3.5, speed / 14).toFixed(1)}px)` : 'none'
      const row = job.from + Math.floor(y / ITEM_H + 0.5)
      if (row !== lastRow) { lastRow = row; beep(audio.current, 760, 0.04, 0.1) }
      if (t < 1) raf.current = requestAnimationFrame(frame)
      else { strip.style.filter = 'none'; job.done() }
    }
    raf.current = requestAnimationFrame(frame)
  }, [spinKey])

  const runReel = (from: Row, winner: Team, pool: Team[]) => new Promise<void>((resolve) => {
    const body: Row[] = []
    let prev: Row = from
    for (let i = 0; i < REEL_ROWS; i++) { prev = pickOther(pool, prev); body.push(prev) }
    if (body[body.length - 1] === winner) body[body.length - 1] = pickOther(pool, winner)
    const above = Array.from({ length: PAD }, () => pickOther(teams, null))
    const below = Array.from({ length: PAD }, () => pickOther(teams, null))
    const next = [...above, from, ...body, winner, ...below]
    const fromIdx = PAD
    const toIdx = PAD + 1 + body.length
    pending.current = { from: fromIdx, to: toIdx, done: () => { setRestIdx(toIdx); resolve() } }
    setRows(next); setRestIdx(fromIdx); setSpinKey((k) => k + 1)
  })

  const spin = async () => {
    if (spinning || teams.length === 0) return
    try { audio.current ??= new AudioContext() } catch {}
    const pool = [...teams]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const draws = pool.slice(0, count)

    setSpinning(true); setPicked([]); onPicked([])
    let current: Row = rows[restIdx] ?? null
    for (let d = 0; d < draws.length; d++) {
      if (!alive.current) return
      setLanded(false); setDrawNo(d + 1)
      const remaining = teams.filter((tm) => !draws.slice(0, d).includes(tm))
      await runReel(current, draws[d], remaining)
      if (!alive.current) return
      current = draws[d]
      setLanded(true)
      beep(audio.current, 880, 0.12); setTimeout(() => beep(audio.current, 1320, 0.25), 110)
      const soFar = draws.slice(0, d + 1)
      setPicked(soFar); onPicked(soFar.map((tm) => tm.id))
      if (d < draws.length - 1) await new Promise((r) => setTimeout(r, GAP_BETWEEN_DRAWS))
    }
    setSpinning(false)
  }

  const stepBtnCls = 'w-8 h-8 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors flex-shrink-0 disabled:opacity-40'

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <style>{`@keyframes ts-thunk { 0% { transform: scale(1) } 35% { transform: scale(1.04) } 100% { transform: scale(1) } }`}</style>

      {/* Reel window */}
      <div className={`relative flex-1 min-h-[200px] rounded-2xl border-2 bg-white overflow-hidden transition-colors ${landed ? 'border-orange-500 shadow-[0_6px_20px_rgba(194,65,12,0.18)]' : 'border-orange-100'}`}>
        {/* pay line */}
        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 border-y-2 transition-colors ${landed ? 'bg-orange-50 border-orange-300' : 'bg-orange-50/50 border-orange-100'}`}
          style={{ height: ITEM_H }} />
        <span className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-0 h-0 border-y-[10px] border-y-transparent border-l-[12px] border-l-orange-500" />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-orange-500" />

        {/* reel strip (moved by the animation; React only sets the resting row) */}
        <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_28%,black_72%,transparent)]">
          <div key={spinKey} className={`absolute inset-x-0 top-1/2 ${landed ? 'animate-[ts-thunk_.3s_ease-out]' : ''}`} style={{ marginTop: -ITEM_H / 2 }}>
            <div ref={stripRef} style={{ transform: `translateY(${-restIdx * ITEM_H}px)`, willChange: 'transform' }}>
              {rows.map((row, i) => {
                const isWinner = landed && i === restIdx
                return (
                  <div key={i} className="flex items-center justify-center gap-3 px-4" style={{ height: ITEM_H }}>
                    {row ? (
                      <>
                        <span className={`w-6 h-6 rounded-full flex-shrink-0 ${row.color}`} />
                        <span className={`font-extrabold text-4xl leading-none truncate ${isWinner ? 'text-orange-900' : 'text-gray-700'}`}>{row.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-300 text-5xl font-extrabold leading-none">?</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {count > 1 && (spinning || picked.length > 0) && (
          <span className="absolute top-3 right-3 z-10 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 tabular-nums">
            {spinning ? drawNo : picked.length} / {count}
          </span>
        )}
      </div>

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
        {teams.length === 0 ? 'ทุกทีมเล่นแล้ว' : spinning ? 'กำลังสุ่ม…' : picked.length > 0 ? `สุ่มใหม่ ${count} ทีม` : `สุ่ม ${count} ทีม`}
      </button>
    </div>
  )
}
