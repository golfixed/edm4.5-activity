'use client'

import { useStore, getTotalScore, getRankedTeams, getGameRankPoints, defaultRankBonuses } from '@/lib/store'

interface Props {
  compact?: boolean
}

export default function Scoreboard({ compact = false }: Props) {
  const state = useStore()
  const ranked = getRankedTeams(state)
  const games = state.games

  const rankIcon = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return String(rank)
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
              <span className={`w-3 h-3 rounded-full ${team.color} flex-shrink-0`} />
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

  // Per-game rankings: teams sorted by raw score descending for each game
  const gameRankings = games.map((g) =>
    [...state.teams].sort((a, b) => {
      const aScore = state.scores.find((s) => s.teamId === a.id && s.gameId === g.id)?.points ?? 0
      const bScore = state.scores.find((s) => s.teamId === b.id && s.gameId === g.id)?.points ?? 0
      return bScore - aScore
    })
  )

  const rankPoints = state.rankBonuses?.length ? state.rankBonuses : defaultRankBonuses

  return (
    <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
      <div className="bg-school-primary px-6 py-4">
        <h2 className="text-white font-bold text-2xl">🏆 ตารางคะแนน</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-school-bg">
              <th className="px-4 py-3 text-left text-school-primary-dark font-bold w-12">อันดับ</th>
              {games.map((g) => {
                const maxRp = Math.round((rankPoints[0] ?? 10) * (g.weight ?? 100) / 100)
                return (
                  <th key={g.id} className="px-4 py-3 text-center text-school-primary-dark font-bold">
                    <div>{g.name}</div>
                    <div className="text-amber-600 text-xs font-normal">สูงสุด {maxRp} pt.</div>
                  </th>
                )
              })}
              <th className="px-4 py-3 text-center text-amber-700 font-bold bg-amber-50">
                Total Score Rank
              </th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((_, idx) => {
              const overallTeam = ranked[idx]
              const overallTotal = getTotalScore(state, overallTeam.id)
              return (
                <tr
                  key={idx}
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* Rank */}
                  <td className="px-4 py-3 text-center text-xl font-bold text-school-primary">
                    {rankIcon(idx + 1)}
                  </td>

                  {/* Per-game: team at this rank for each game */}
                  {games.map((g, gi) => {
                    const team = gameRankings[gi][idx]
                    if (!team) return <td key={g.id} className="px-4 py-3 text-center text-gray-300">—</td>
                    const raw = state.scores.find((s) => s.teamId === team.id && s.gameId === g.id)?.points
                    const hasScore = state.scores.some((s) => s.gameId === g.id)
                    const rp = getGameRankPoints(state, g.id, team.id)
                    const weighted = Math.round(rp * (g.weight ?? 100) / 100)
                    return (
                      <td key={g.id} className="px-4 py-3 text-center">
                        {hasScore ? (
                          <div>
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${team.color}`} />
                              <span className="font-semibold text-gray-800 text-sm">{team.name}</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-0.5">
                              {raw ?? 0} คะแนนดิบ
                              <span className="text-amber-600 font-semibold ml-1">({weighted} pt.)</span>
                            </div>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}

                  {/* Total Score Rank */}
                  <td className="px-4 py-3 bg-amber-50">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${overallTeam.color}`} />
                      <span className="font-semibold text-gray-800 text-sm">{overallTeam.name}</span>
                    </div>
                    <div className="text-center text-amber-600 font-bold text-sm mt-0.5">
                      {overallTotal} <span className="font-normal text-xs">pt.</span>
                    </div>
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
