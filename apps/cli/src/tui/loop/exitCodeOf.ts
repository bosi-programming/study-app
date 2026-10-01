import { type TuiOutcome } from './types.ts'

export function exitCodeOf(outcome: TuiOutcome): number {
  switch (outcome) {
    case 'quit':
      return 0
    case 'interrupt':
      return 130
    case 'fatal':
      return 1
  }
}
