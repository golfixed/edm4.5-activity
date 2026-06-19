import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get, set as idbSet, del } from 'idb-keyval'
import { Team, Game, Score, GameState } from './types'

const idbStorage = createJSONStorage(() => ({
  getItem: (name: string) => get(name).then((v) => v ?? null),
  setItem: (name: string, value: string) => idbSet(name, value),
  removeItem: (name: string) => del(name),
}))

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

export const defaultTeams: Team[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  name: `ทีม ${i + 1}`,
  color: TEAM_COLORS[i],
}))

export const defaultGames: Game[] = [
  { id: '1', name: 'เกมทายโลโก้', icon: '🔍', type: 'spot-difference', timerSeconds: 10 },
  { id: '2', name: 'Human Bingo', icon: '🎯', type: 'human-bingo', bingoKeywords: ['เคยไปญี่ปุ่น','ใช้ Mechanical Keyboard','มีแมว','เล่นเกม','เคย deploy พัง','ดื่มกาแฟทุกวัน','มี package มาส่งออฟฟิศ','ใช้ dark mode','ดู anime','นอนหลังเที่ยงคืน','เคยตอบ LGTM','มี tab เกิน 20','เล่นฟิตเนส','เคยประชุม mute ไม่เป็น','ชอบขับรถ','เคยลาเพราะนอนต่อ','มี Steam account','ใช้ ChatGPT ทำงาน','ชอบกินชาบู','เคยทำ OT ถึงดึก','มี keyboard เกิน 1 ตัว','ใช้ iPad','ฟัง podcast','เคยลืมเปิดกล้อง'] },
  { id: '3', name: 'เกม 3', icon: '⚽', type: 'physical' },
  { id: '4', name: 'เกม 4', icon: '🎯', type: 'physical' },
]

export const defaultRankBonuses = [10, 8, 7, 6, 5]

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

export const useStore = create<Store>()(
  persist(
    (set) => ({
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
    }),
    { name: 'edm-activity', storage: idbStorage }
  )
)

// Returns the rank position (1-based) of a team in a single game. Returns null if no scores recorded.
export function getGameRank(state: GameState, gameId: string, teamId: string): number | null {
  const hasAnyScore = state.scores.some((s) => s.gameId === gameId)
  if (!hasAnyScore) return null
  const myScore = state.scores.find((s) => s.teamId === teamId && s.gameId === gameId)?.points ?? 0
  return state.teams.filter((t) => {
    const pts = state.scores.find((s) => s.teamId === t.id && s.gameId === gameId)?.points ?? 0
    return pts > myScore
  }).length + 1
}

// Returns rank points earned by a team in a single game.
// Rank is determined by comparing raw scores; teams with no entry are treated as 0.
// Ties share the same rank (e.g. two 1st-place ties both get rank-1 points).
// Returns 0 if the game has no scores recorded yet.
export function getGameRankPoints(state: GameState, gameId: string, teamId: string): number {
  const rankPoints = state.rankBonuses?.length ? state.rankBonuses : defaultRankBonuses
  const lastPoints = rankPoints[rankPoints.length - 1] ?? 0

  const hasAnyScore = state.scores.some((s) => s.gameId === gameId)
  if (!hasAnyScore) return 0

  const myScore = state.scores.find((s) => s.teamId === teamId && s.gameId === gameId)?.points ?? 0
  const rank = state.teams.filter((t) => {
    const pts = state.scores.find((s) => s.teamId === t.id && s.gameId === gameId)?.points ?? 0
    return pts > myScore
  }).length + 1

  return rankPoints[rank - 1] ?? lastPoints
}

export function getTotalScore(state: GameState, teamId: string): number {
  return Math.round(
    state.games.reduce((sum, game) => {
      const rp = getGameRankPoints(state, game.id, teamId)
      const weight = game.weight ?? 100
      return sum + rp * weight / 100
    }, 0)
  )
}

export function getRankedTeams(state: GameState): Team[] {
  return [...state.teams].sort(
    (a, b) => getTotalScore(state, b.id) - getTotalScore(state, a.id)
  )
}

export const TEAM_COLORS_LIST = TEAM_COLORS
