import { type Item, type ReviewLog } from '@study/core'

export type StatsCounts = {
  readonly active: number
  readonly archived: number
  readonly cold: number
}

export type CommandView =
  | { readonly kind: 'db-created'; readonly dbPath: string }
  | { readonly kind: 'db-reset'; readonly dbPath: string; readonly backupPath: string }
  | { readonly kind: 'item-created'; readonly item: Item }
  | { readonly kind: 'items'; readonly items: readonly Item[]; readonly today: string }
  | {
      readonly kind: 'queue'
      readonly overdue: readonly Item[]
      readonly dueToday: readonly Item[]
      readonly today: string
      readonly bySubject: Readonly<Record<string, number>>
    }
  | { readonly kind: 'item-reviewed'; readonly item: Item }
  | {
      readonly kind: 'item-detail'
      readonly item: Item
      readonly today: string
      readonly history: readonly ReviewLog[] | null
    }
  | { readonly kind: 'item-updated'; readonly item: Item }
  | { readonly kind: 'item-removed'; readonly item: Item }
  | { readonly kind: 'item-archived'; readonly item: Item }
  | { readonly kind: 'item-unarchived'; readonly item: Item }
  | { readonly kind: 'cold-items'; readonly items: readonly Item[] }
  | { readonly kind: 'item-restored'; readonly item: Item }
  | { readonly kind: 'item-purged'; readonly item: Item }
  | { readonly kind: 'config-value'; readonly key: string; readonly value: number }
  | {
      readonly kind: 'stats'
      readonly currentStreak: number
      readonly items: StatsCounts
      readonly checkinsToday: number
      readonly bySubject: Readonly<Record<string, number>>
    }
  | { readonly kind: 'exported'; readonly path: string }
  | { readonly kind: 'imported'; readonly items: number; readonly checkins: number }

export type CommandResult = {
  readonly json: Record<string, unknown>
  readonly view: CommandView
}
