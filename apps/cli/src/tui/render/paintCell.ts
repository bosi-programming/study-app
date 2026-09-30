import { paint } from '../../output/color.ts'
import { truncate } from './truncate.ts'
import { width } from './width.ts'

export function paintCell(text: string, limit: number, hex: string, color: boolean, bold = false): string {
  const clipped = truncate(text, limit)
  return paint(hex, clipped, color, bold) + ' '.repeat(limit - width(clipped))
}
