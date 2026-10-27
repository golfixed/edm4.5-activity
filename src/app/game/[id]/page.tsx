'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import SpotDifferenceGame from '@/components/SpotDifferenceGame'
import PhysicalGame from '@/components/PhysicalGame'
import BingoGame from '@/components/BingoGame'
import GameSettings from '@/components/GameSettings'
import Link from 'next/link'

export default function GamePage({ params }: { params: { id: string } }) {
  const { games } = useStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const game = games.find((g) => g.id === params.id)

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
      {game.type === 'spot-difference' && <SpotDifferenceGame game={game} />}
      {game.type === 'human-bingo' && <BingoGame game={game} />}
      {game.type !== 'spot-difference' && game.type !== 'human-bingo' && <PhysicalGame game={game} />}

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
