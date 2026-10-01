import { initialDueDate, intervalFor, toDifficulty } from '@study/core'

export type DueEstimate = {
  readonly dueDate: string
  readonly intervalDays: number
}

export function initialDueEstimate(difficulty: number, createdOn: string): DueEstimate {
  const resolved = toDifficulty(difficulty)

  return {
    dueDate: initialDueDate(resolved, createdOn),
    intervalDays: intervalFor(resolved, 0),
  }
}

export function tryInitialDueEstimate(difficulty: number, createdOn: string): DueEstimate | null {
  try {
    return initialDueEstimate(difficulty, createdOn)
  } catch {
    return null
  }
}
