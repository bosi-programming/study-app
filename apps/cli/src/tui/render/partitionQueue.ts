import { isLate } from '@study/core'
import type { QueuePartition, RenderState } from './types.ts'

export function partitionQueue(state: RenderState): QueuePartition {
  const overdue = state.queue.filter((item) => isLate(item, state.today))
  const today = state.queue.filter((item) => !isLate(item, state.today))
  return { overdue, today }
}
