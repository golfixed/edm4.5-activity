'use client'

import Link from 'next/link'
import Scoreboard from '@/components/Scoreboard'
import { useStore } from '@/lib/store'

const GAME_COLORS: Record<string, string> = {
  '1': 'bg-green-100 border-green-400',
  '2': 'bg-blue-100 border-blue-400',
  '3': 'bg-orange-100 border-orange-400',
  '4': 'bg-purple-100 border-purple-400',
}

export default function Home() {
  const games = useStore((s) => s.games)

  return (
    <div className="min-h-screen p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-school-primary-dark mb-2">
          🏫 EDM Activity
        </h1>
        <p className="text-school-primary text-lg">ระบบบันทึกคะแนนกิจกรรมโรงเรียน</p>
      </header>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/admin"
            className="px-6 py-3 bg-school-primary text-white rounded-xl font-semibold shadow hover:bg-school-primary-dark transition-colors"
          >
            ⚙️ เข้าสู่การแข่งขัน (Admin)
          </Link>
          <Link
            href="/scoreboard"
            className="px-6 py-3 bg-school-primary-light text-white rounded-xl font-semibold shadow hover:bg-school-primary transition-colors"
          >
            📊 หน้าจอคะแนน (Projector)
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {games.map((g) => {
            const color = GAME_COLORS[g.id] ?? 'bg-gray-100 border-gray-400'
            return (
              <Link
                key={g.id}
                href={`/game/${g.id}`}
                className={`rounded-2xl border-2 ${color} p-4 text-center hover:shadow-lg transition-shadow cursor-pointer`}
              >
                <div className="text-4xl mb-2">{g.icon ?? '🎮'}</div>
                <div className="font-semibold text-gray-700">{g.name}</div>
              </Link>
            )
          })}
        </div>

        <Scoreboard />
      </div>
    </div>
  )
}
