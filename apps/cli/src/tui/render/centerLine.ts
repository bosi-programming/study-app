import { padCell } from './padCell.ts'
import { truncate } from './truncate.ts'
import { width } from './width.ts'

export function centerLine(text: string, limit: number): string {
  const clipped = truncate(text, limit)
  const left = Math.max(0, Math.floor((limit - width(clipped)) / 2))
  return ' '.repeat(left) + padCell(clipped, limit - left)
}
