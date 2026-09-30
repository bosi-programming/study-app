import { type Item } from '@study/core'

export function moveFocus(
  queue: readonly Item[],
  focusId: string | null,
  step: 'next' | 'prev' | 'first' | 'last',
): string | null {
  if (queue.length === 0) return null
  if (step === 'first') return queue[0]?.id ?? null
  if (step === 'last') return queue[queue.length - 1]?.id ?? null

  const index = queue.findIndex((item) => item.id === focusId)
  const current = index < 0 ? 0 : index
  const next = step === 'next' ? Math.min(current + 1, queue.length - 1) : Math.max(current - 1, 0)
  return queue[next]?.id ?? null
}
