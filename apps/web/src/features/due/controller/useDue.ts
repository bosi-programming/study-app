import { useMemo } from 'react'
import { type DueEstimate, initialDueEstimate } from '../model/due.ts'

export function useDue(difficulty: number, createdOn: string): DueEstimate {
  return useMemo(() => initialDueEstimate(difficulty, createdOn), [difficulty, createdOn])
}
