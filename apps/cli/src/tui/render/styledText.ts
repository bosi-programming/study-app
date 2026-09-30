import { paint } from '../../output/color.ts'
import type { StyledText } from './types.ts'

export function styledText(text: string, hex: string, color: boolean, bold = false): StyledText {
  return { plain: text, painted: paint(hex, text, color, bold) }
}
