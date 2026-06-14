'use client'

import { useStore } from '@/lib/store'
import SpotDifferenceGame from '@/components/SpotDifferenceGame'
import PhysicalGame from '@/components/PhysicalGame'
import Link from 'next/link'

export default function GamePage({ params }: { params: { id: string } }) {
  const { games } = useStore()
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

  if (game.type === 'spot-difference') {
    return <SpotDifferenceGame game={game} />
  }

  return <PhysicalGame game={game} />
}
