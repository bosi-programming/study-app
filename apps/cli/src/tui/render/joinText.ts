import type { StyledText } from './types.ts'

export function joinText(parts: readonly StyledText[]): StyledText {
  return {
    plain: parts.map((part) => part.plain).join(''),
    painted: parts.map((part) => part.painted).join(''),
  }
}
