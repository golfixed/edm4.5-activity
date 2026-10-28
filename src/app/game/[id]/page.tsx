'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import SpotDifferenceGame from '@/components/SpotDifferenceGame'
import PhysicalGame from '@/components/PhysicalGame'
import BingoGame from '@/components/BingoGame'
import GameSettings from '@/components/GameSettings'
import Link from 'next/link'

export default function GamePage({ params }: { params: { id: string } }) {
  const { games } = useStore()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [closing, setClosing] = useState(false) // prevents double-tap
  const game = games.find((g) => g.id === params.id)

  const handleBack = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (closing) return
    setClosing(true)
    // Signal home page to play reverse animation; navigate immediately so home is the backdrop
    try { sessionStorage.setItem('returnFromGame', game?.id ?? '') } catch {}
    router.push('/')
  }, [closing, router, game])

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-xl mb-4">ไม่พบเกมนี้</p>
          <Link href="/" className="text-school-primary hover:underline">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>

      {game.type === 'spot-difference' && <SpotDifferenceGame game={game} onBack={handleBack} />}
      {game.type === 'human-bingo' && <BingoGame game={game} onBack={handleBack} />}
      {game.type !== 'spot-difference' && game.type !== 'human-bingo' && <PhysicalGame game={game} onBack={handleBack} />}

      {/* Floating settings button */}
      <button
        onClick={() => setSettingsOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 30,
          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
          color: 'white', fontSize: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="ตั้งค่าเกม"
      >
        ⚙️
      </button>

      {settingsOpen && <GameSettings game={game} onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
