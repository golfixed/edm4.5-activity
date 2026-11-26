import type { ComponentType } from 'react'
import type { InstructionsPageProps } from './InstructionsShell'
import FishFanInstructions from './FishFanInstructions'
import RocketCupInstructions from './RocketCupInstructions'

export interface GameInstructions {
  Page: ComponentType<InstructionsPageProps>
  /** extra one-tap button per team in the score pop-up */
  quickAdd?: { label: string; points: number }
}

/** How-to-play page for a physical game, matched on its name; null if it has none. */
export function getGameInstructions(name: string): GameInstructions | null {
  if (name.includes('ปลา')) return { Page: FishFanInstructions, quickAdd: { label: 'ปลาแดง', points: 10 } }
  if (name.includes('จรวด')) return { Page: RocketCupInstructions }
  return null
}
