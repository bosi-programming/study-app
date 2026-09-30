import { type Item } from '@study/core'

export function reconcileFocus(
  focusId: string | null,
  previousQueue: readonly Item[],
  nextQueue: readonly Item[],
): string | null {
  if (nextQueue.length === 0) return null
  if (focusId !== null && nextQueue.some((item) => item.id === focusId)) return focusId

  const previousIndex = focusId === null ? 0 : previousQueue.findIndex((item) => item.id === focusId)
  const index = Math.min(previousIndex < 0 ? 0 : previousIndex, nextQueue.length - 1)
  return nextQueue[index]?.id ?? null
}
