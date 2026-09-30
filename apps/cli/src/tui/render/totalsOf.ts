import type { QueuePartition } from './types.ts'

export function totalsOf(partition: QueuePartition): { overdue: number; today: number } {
  return { overdue: partition.overdue.length, today: partition.today.length }
}
