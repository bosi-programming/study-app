import { fieldLine } from './fieldLine.ts'
import { joinText } from './joinText.ts'
import { plainText } from './plainText.ts'
import type { StyledText } from './types.ts'

export function fieldRow(
  left: readonly [string, string],
  right: readonly [string, string] | null,
  leftWidth: number,
  rightWidth: number,
  color: boolean,
): StyledText {
  const leftCell = fieldLine(left[0], left[1], leftWidth, color)
  if (right === null) return joinText([plainText(' '), leftCell])
  return joinText([plainText(' '), leftCell, plainText(' '), fieldLine(right[0], right[1], rightWidth, color)])
}
