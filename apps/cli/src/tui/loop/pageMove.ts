import { type KeyCommand } from '../keys.ts'

export type PageMove = {
  readonly action: 'focus-next' | 'focus-prev'
  readonly steps: number
}

export function pageMoveOf(command: KeyCommand, pageSize: number): PageMove | null {
  if (command.kind === 'page-next') return { action: 'focus-next', steps: Math.max(1, pageSize) }
  if (command.kind === 'page-prev') return { action: 'focus-prev', steps: Math.max(1, pageSize) }
  return null
}
