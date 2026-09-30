import { type Item } from '@study/core'

export function initialFocusId(queue: readonly Item[], today: string): string | null {
  const late = queue.find((item) => item.due_date < today)
  return late?.id ?? queue[0]?.id ?? null
}
