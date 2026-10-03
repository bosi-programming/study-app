import type { Difficulty, Item, QueueStreak, ReviewLog } from '@study/core'
import type { FormField } from '../fieldTypes.ts'
import type { TextField } from './field.ts'

export type { FormField } from '../fieldTypes.ts'

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

export type RenderScreen = 'queue' | 'detail' | 'reevaluate' | 'help' | 'form' | 'cold' | 'config' | 'path' | 'confirm' | 'items'

export type RenderForm = {
  readonly mode: 'add' | 'edit'
  readonly fields: Readonly<Record<FormField, TextField>>
  readonly focus: FormField
}

export type RenderColdItem = {
  readonly item: Item
  readonly archivedOn: string | null
  readonly focused: boolean
}

export type RenderCold = {
  readonly items: readonly RenderColdItem[]
}

export type RenderConfig = {
  readonly key: string
  readonly value: string
  readonly editing: boolean
  readonly field: TextField
}

export type RenderPath = {
  readonly mode: 'export' | 'import'
  readonly field: TextField
}

export type RenderConfirm = {
  readonly message: string
}

export type RenderItemsItem = {
  readonly item: Item
  readonly focused: boolean
}

export type RenderItems = {
  readonly focusId: string | null
  readonly items: readonly RenderItemsItem[]
}

export type RenderState = {
  readonly today: string
  readonly screen: RenderScreen
  readonly queue: readonly Item[]
  readonly focusId: string | null
  readonly detail: RenderDetail | null
  readonly reevaluation: RenderReevaluation | null
  readonly confirmation: string | null
  readonly form: RenderForm | null
  readonly cold: RenderCold | null
  readonly config: RenderConfig | null
  readonly path: RenderPath | null
  readonly confirm: RenderConfirm | null
  readonly items: RenderItems | null
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
