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
      {game.type === 'spot-difference' && <SpotDifferenceGame game={game} onBack={handleBack} onOpenSettings={() => setSettingsOpen(true)} />}
      {game.type === 'human-bingo' && <BingoGame game={game} onBack={handleBack} onOpenSettings={() => setSettingsOpen(true)} />}
      {game.type !== 'spot-difference' && game.type !== 'human-bingo' && <PhysicalGame game={game} onBack={handleBack} onOpenSettings={() => setSettingsOpen(true)} />}

      {settingsOpen && <GameSettings game={game} onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
