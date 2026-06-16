'use client'

import { useStore, getTotalScore, getRankedTeams } from '@/lib/store'

interface Props {
  compact?: boolean
}

export default function Scoreboard({ compact = false }: Props) {
  const state = useStore()
  const ranked = getRankedTeams(state)
  const games = state.games
  const rankBonuses = state.rankBonuses ?? [50, 45, 40, 35]

  const rankIcon = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return String(rank)
  }

  const rankToBonus = (rank: number) => {
    const idx = rank - 1
    return rankBonuses[idx] ?? rankBonuses[rankBonuses.length - 1] ?? 0
  }

  if (compact) {
    return (
      <div className="rounded-2xl bg-white shadow-md overflow-hidden">
        <div className="bg-school-primary px-4 py-3">
          <h2 className="text-white font-bold text-lg">🏆 คะแนนรวม</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {ranked.map((team, idx) => (
            <div key={team.id} className="flex items-center px-4 py-2 gap-3">
              <span className="w-8 text-center font-bold text-school-primary">
                {rankIcon(idx + 1)}
              </span>
              <span
                className={`w-3 h-3 rounded-full ${team.color} flex-shrink-0`}
              />
              <span className="flex-1 font-medium text-gray-800">
                {team.name}{team.captain ? ` (${team.captain})` : ''}
              </span>
              <span className="font-bold text-school-primary text-lg">
                {getTotalScore(state, team.id)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
      <div className="bg-school-primary px-6 py-4">
        <h2 className="text-white font-bold text-2xl">🏆 ตารางคะแนน</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-school-bg">
              <th className="px-4 py-3 text-left text-school-primary-dark font-bold">
                อันดับ
              </th>
              <th className="px-4 py-3 text-left text-school-primary-dark font-bold">
                ทีม
              </th>
              {games.map((g) => (
                <th
                  key={g.id}
                  className="px-4 py-3 text-center text-school-primary-dark font-bold"
                >
                  {g.name}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-school-primary-dark font-bold">
                รวม
              </th>
              <th className="px-4 py-3 text-center text-amber-700 font-bold bg-amber-50">
                คะแนนสุทธิ
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((team, idx) => {
              const total = getTotalScore(state, team.id)
              return (
                <tr
                  key={team.id}
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-center text-xl">
                    {rankIcon(idx + 1)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${team.color} flex-shrink-0`} />
                      <div>
                        <span className="font-medium text-gray-800">{team.name}</span>
                        {team.captain && (
                          <span className="text-gray-400 text-xs ml-1">({team.captain})</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {games.map((g) => {
                    const score = state.scores.find(
                      (s) => s.teamId === team.id && s.gameId === g.id
                    )
                    return (
                      <td
                        key={g.id}
                        className="px-4 py-3 text-center text-gray-600"
                      >
                        {score ? score.points : '-'}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-center font-bold text-school-primary text-lg">
                    {total}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-amber-600 text-lg bg-amber-50">
                    {rankToBonus(idx + 1)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
