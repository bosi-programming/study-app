import { truncate } from './truncate.ts'
import { width } from './width.ts'

export function padCell(text: string, limit: number): string {
  const clipped = truncate(text, limit)
  return clipped + ' '.repeat(limit - width(clipped))
}
