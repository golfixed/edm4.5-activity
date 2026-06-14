import { create } from 'zustand'
import { Team, Game, Score, GameState } from './types'

const TEAM_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-rose-500',
]

export const defaultTeams: Team[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  name: `ทีม ${i + 1}`,
  color: TEAM_COLORS[i],
}))

export const defaultGames: Game[] = [
  { id: '1', name: 'เกมทายโลโก้', icon: '🔍', type: 'spot-difference', timerSeconds: 30 },
  { id: '2', name: 'เกม 2', icon: '🏃', type: 'physical' },
  { id: '3', name: 'เกม 3', icon: '⚽', type: 'physical' },
  { id: '4', name: 'เกม 4', icon: '🎯', type: 'physical' },
]

export const defaultRankBonuses = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]

interface StoreActions {
  setTeams: (teams: Team[]) => void
  setGames: (games: Game[]) => void
  addScore: (score: Score) => void
  setActiveGame: (id: string | null) => void
  resetScores: () => void
  setRankBonuses: (bonuses: number[]) => void
  // internal: bulk-replace state from Firebase snapshot
  _hydrate: (partial: Partial<GameState>) => void
}

type Store = GameState & StoreActions

export const useStore = create<Store>()((set, get) => ({
  teams: defaultTeams,
  games: defaultGames,
  scores: [],
  activeGameId: null,
  rankBonuses: defaultRankBonuses,

  setTeams: (teams) => set({ teams }),
  setGames: (games) => set({ games }),
  addScore: (score) =>
    set((state) => {
      const existing = state.scores.findIndex(
        (s) => s.teamId === score.teamId && s.gameId === score.gameId
      )
      if (existing >= 0) {
        const updated = [...state.scores]
        updated[existing] = score
        return { scores: updated }
      }
      return { scores: [...state.scores, score] }
    }),
  setActiveGame: (id) => set({ activeGameId: id }),
  resetScores: () => set({ scores: [] }),
  setRankBonuses: (rankBonuses) => set({ rankBonuses }),
  _hydrate: (partial) => set(partial),
}))

export function getTotalScore(state: GameState, teamId: string): number {
  return state.scores
    .filter((s) => s.teamId === teamId)
    .reduce((sum, s) => sum + s.points, 0)
}

export function getRankedTeams(state: GameState): Team[] {
  return [...state.teams].sort(
    (a, b) => getTotalScore(state, b.id) - getTotalScore(state, a.id)
  )
}

export const TEAM_COLORS_LIST = TEAM_COLORS
