import type { Difficulty, Item, QueueStreak, ReviewLog } from '@study/core'

export type StyledText = {
  readonly plain: string
  readonly painted: string
}

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

export type FrameWidths = {
  readonly subject: number
  readonly title: number
  readonly due: number
}

export type QueueRow =
  | { readonly kind: 'item'; readonly number: number; readonly item: Item; readonly line: string }
  | { readonly kind: 'other'; readonly line: string }

export type QueueWindow = {
  readonly visible: readonly QueueRow[]
  readonly from: number | null
  readonly to: number | null
  readonly above: number
  readonly below: number
  readonly clipped: boolean
  readonly capacity: number
}

export type ScrollBars = {
  readonly above: readonly string[]
  readonly below: readonly string[]
}

export type QueuePartition = {
  readonly overdue: readonly Item[]
  readonly today: readonly Item[]
}

export type BoxChars = {
  readonly tl: string
  readonly tr: string
  readonly bl: string
  readonly br: string
  readonly h: string
  readonly v: string
}

export type BoxOptions = {
  readonly columns: number
  readonly rows: number
  readonly utf8: boolean
  readonly color: boolean
  readonly banner: string | null
}
