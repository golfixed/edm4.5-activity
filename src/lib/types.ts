export interface Team {
  id: string
  name: string
  color: string // tailwind bg color class
}

export interface ImagePair {
  id: string
  imageA: string // base64
  imageB: string // base64
  label?: string
  correctImage?: 'A' | 'B'
}

export interface ImageSet {
  id: string
  name: string
  pairs: ImagePair[]
}

export interface Game {
  id: string
  name: string
  icon?: string
  type: 'spot-difference' | 'physical' | 'human-bingo'
  backgroundImage?: string // base64 or URL
  bingoKeywords?: string[]
  imageSets?: ImageSet[]
  timerSeconds?: number
  soundStart?: string
  soundTick?: string
  soundTimeUp?: string
}

export interface Score {
  teamId: string
  gameId: string
  points: number
}

export interface GameState {
  teams: Team[]
  games: Game[]
  scores: Score[]
  activeGameId: string | null
  rankBonuses: number[] // index 0 = rank1, 1 = rank2, ... last value = default for remaining
}
