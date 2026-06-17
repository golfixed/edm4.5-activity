'use client'

import { useState, useRef, useEffect } from 'react'
import { AuctionItem } from '@/lib/types'

interface Props {
  items: AuctionItem[]
  gameName: string
  onClose: () => void
}

export default function AuctionPhase({ items, gameName, onClose }: Props) {
  const [round, setRound] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const item = items[round]
  const total = items.length

  useEffect(() => {
    setRevealed(false)
    setPlaying(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [round])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play(); setPlaying(true) }
  }

  const handleVideoEnd = () => setPlaying(false)

  const goNext = () => {
    if (round < total - 1) setRound(round + 1)
    else onClose()
  }

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-school-primary shadow flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 border border-white/40 rounded-lg text-white hover:bg-white/10 transition-colors text-sm"
          >
            ✕ ปิด
          </button>
          <h1 className="text-white font-bold text-xl">{gameName} — ประมูลอุปกรณ์</h1>
        </div>
        <span className="text-white/60 text-sm font-semibold">รอบ {round + 1} / {total}</span>
      </div>

      {/* Round progress */}
      <div className="flex gap-1.5 px-6 py-3 bg-school-primary-dark flex-shrink-0">
        {items.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < round ? 'bg-school-accent' : i === round ? 'bg-white' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Video area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {item.videoBase64 ? (
          <>
            <video
              ref={videoRef}
              src={item.videoBase64}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnd}
              playsInline
            />
            {/* Overlay — hide visuals before reveal */}
            {!revealed && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-6">
                <div className="font-black text-white/80 animate-pulse leading-none" style={{ fontSize: 'clamp(16rem, 50vw, 60vh)' }}>?</div>
                {playing && (
                  <div className="flex gap-1">
                    {[0,1,2,3,4].map(i => (
                      <div key={i} className="w-1.5 bg-school-accent rounded-full animate-bounce" style={{ height: 24 + Math.random() * 20, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-white/40">
            <span className="text-6xl">📦</span>
            <span>ยังไม่มีวิดีโอ</span>
          </div>
        )}

        {/* Reveal name banner */}
        {revealed && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur px-8 py-6 text-center">
            <div className="text-school-accent text-4xl font-extrabold">{item.name}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 bg-school-primary-dark px-6 py-4 flex gap-3">
        {/* Prev */}
        {round > 0 && (
          <button
            onClick={() => setRound(round - 1)}
            className="px-4 py-3 rounded-xl font-bold text-base bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors"
          >
            ←
          </button>
        )}

        {/* Play/pause */}
        {item.videoBase64 && (
          <button
            onClick={togglePlay}
            className={`flex-1 py-3 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 ${
              playing ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
            }`}
          >
            {playing ? '⏸ หยุด' : '▶ เล่นเสียง'}
          </button>
        )}

        {!revealed ? (
          <button
            onClick={() => { setRevealed(true); if (videoRef.current) { videoRef.current.play(); setPlaying(true) } }}
            className="flex-1 py-3 rounded-xl font-bold text-base bg-school-accent text-school-primary-dark hover:bg-white transition-colors"
          >
            🎉 เฉลย
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex-1 py-3 rounded-xl font-bold text-base bg-white/20 text-white border border-white/20 hover:bg-white/30 transition-colors"
          >
            {round < total - 1 ? `รอบถัดไป → (${round + 2}/${total})` : '✓ จบการประมูล'}
          </button>
        )}
      </div>
    </div>
  )
}
