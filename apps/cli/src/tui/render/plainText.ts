import type { StyledText } from './types.ts'

export function plainText(text: string): StyledText {
  return { plain: text, painted: text }
}
