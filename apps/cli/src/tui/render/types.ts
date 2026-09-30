import type { Difficulty, Item, QueueStreak, ReviewLog } from '@study/core'

export type RenderViewport = {
  readonly columns: number
  readonly rows: number
}

export type RenderDetail = {
  readonly item: Item
  readonly history: readonly ReviewLog[]
}

export type RenderReevaluation = {
  readonly item: Item
  readonly currentDifficulty: Difficulty
}

export type RenderScreen = 'queue' | 'detail' | 'reevaluate' | 'help'

export type RenderState = {
  readonly today: string
  readonly screen: RenderScreen
  readonly queue: readonly Item[]
  readonly focusId: string | null
  readonly detail: RenderDetail | null
  readonly reevaluation: RenderReevaluation | null
  readonly confirmation: string | null
  readonly streak: QueueStreak
  readonly banner: string | null
  readonly fatal: string | null
  readonly viewport: RenderViewport
  readonly color: boolean
  readonly utf8: boolean
}
