import { type Item } from '@study/core'

export function listableItems(items: readonly Item[]): Item[] {
  return [
    ...items.filter((item) => item.status === 'active'),
    ...items.filter((item) => item.status === 'archived'),
  ]
}
