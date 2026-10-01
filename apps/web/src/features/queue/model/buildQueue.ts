import { compareDates, daysLate, isLate, type Item } from '@study/core'

export type QueueEntry = {
  readonly item: Item
  readonly late: boolean
  readonly daysLate: number
}

export type SubjectCount = {
  readonly subject: string
  readonly count: number
}

export type QueueSummary = {
  readonly total: number
  readonly late: number
  readonly bySubject: readonly SubjectCount[]
}

export type Queue = {
  readonly entries: readonly QueueEntry[]
  readonly summary: QueueSummary
}

export function buildQueue(items: readonly Item[], today: string): Queue {
  const ordered = [...items].toSorted(byDueDateThenId)
  const entries = ordered.map((item) => ({
    item,
    late: isLate(item, today),
    daysLate: daysLate(item, today),
  }))

  return { entries, summary: summarize(entries) }
}

function byDueDateThenId(left: Item, right: Item): number {
  const order = compareDates(left.due_date, right.due_date)
  if (order !== 0) return order
  if (left.id === right.id) return 0
  return left.id < right.id ? -1 : 1
}

function summarize(entries: readonly QueueEntry[]): QueueSummary {
  const bySubject = new Map<string, number>()
  let late = 0

  for (const entry of entries) {
    if (entry.late) late += 1
    bySubject.set(entry.item.subject, (bySubject.get(entry.item.subject) ?? 0) + 1)
  }

  return {
    total: entries.length,
    late,
    bySubject: [...bySubject].map(([subject, count]) => ({ subject, count })),
  }
}
