export interface Team {
  id: string
  name: string
  color: string // tailwind bg color class
  captain?: string
}

export interface ImagePair {
  id: string
  imageA: string // base64
  imageB: string // base64
  label?: string
  question?: string
  questionImage?: string
  revealImage?: string // shown after timeout/reveal
  timerSeconds?: number // overrides game default if set
  correctImage?: 'A' | 'B'
}

/**
 * The question text shown during play. Older pairs kept it in `label` (a title field that has
 * since been removed); auto-generated "ข้อที่ N" labels are not questions.
 */
export function pairQuestionText(pair: Pick<ImagePair, 'question' | 'label'>): string | undefined {
  if (pair.question) return pair.question
  if (pair.label && !/^ข้อที่ \d+$/.test(pair.label.trim())) return pair.label
  return undefined
}

export interface ImageSet {
  id: string
  name: string
  pairs: ImagePair[]
}

export interface AuctionItem {
  id: string
  name: string
  videoBase64?: string // base64 video; overlay covers it before reveal
}

export interface Game {
  id: string
  name: string
  icon?: string
  type: 'spot-difference' | 'physical' | 'human-bingo' | 'system-app'
  backgroundImage?: string // base64 or URL
  bingoKeywords?: string[]
  imageSets?: ImageSet[]
  timerSeconds?: number
  weight?: number // % score weight for rank calculation, default 100
  colorIdx?: number | null // index into ICON_COLORS palette
  iconColor?: { from: string; to: string } | null // custom gradient overrides colorIdx
  soundStart?: string | null
  soundTick?: string | null
  soundTimeUp?: string | null
  auctionItems?: AuctionItem[]
  playedSetIds?: string[] // Left or Right?: image sets already used in a saved round (each set plays once)
  bonusRoundPlayed?: boolean // Left or Right?: the all-teams bonus round has been saved (once per game)
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
  appTitle: string
  appTitleSize: number // px, default 20
  dockGameIds: string[]
  gameOrder: string[]
  wallpaperColor: string // hex base color for home gradient
}
