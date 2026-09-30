import type { QueueRow } from './types.ts'

export function focusIndex(rows: readonly QueueRow[], focusId: string | null): number {
  const index = rows.findIndex((row) => row.kind === 'item' && row.item.id === focusId)
  return index < 0 ? 0 : index
}
