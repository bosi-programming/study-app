import { truncate } from './truncate.ts'
import type { StyledText } from './types.ts'
import { width } from './width.ts'

export function padStyled(line: StyledText, limit: number): StyledText {
  const clipped = truncate(line.plain, limit)
  const painted = width(clipped) === width(line.plain) ? line.painted : clipped
  return { plain: clipped, painted: painted + ' '.repeat(limit - width(clipped)) }
}
