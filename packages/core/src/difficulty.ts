import { type Difficulty } from './entity.ts'
import { InvalidDifficultyError } from './errors.ts'

export const MIN_DIFFICULTY = 1
export const MAX_DIFFICULTY = 5

export function toDifficulty(value: number): Difficulty {
  if (!Number.isInteger(value) || value < MIN_DIFFICULTY || value > MAX_DIFFICULTY) {
    throw new InvalidDifficultyError(value)
  }
  return value as Difficulty
}
