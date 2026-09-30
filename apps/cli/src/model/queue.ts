import { type Item, isLate } from '@study/core'

export type QueueSplit = {
  readonly overdue: readonly Item[]
  readonly dueToday: readonly Item[]
}

export function splitQueue(items: readonly Item[], today: string): QueueSplit {
  return {
    overdue: items.filter((item) => isLate(item, today)),
    dueToday: items.filter((item) => !isLate(item, today)),
  }
}

export function countBySubject(items: readonly Item[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) counts[item.subject] = (counts[item.subject] ?? 0) + 1
  return counts
}
