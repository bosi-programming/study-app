import { ACCENT_HEX, MUTED_HEX } from '../../output/color.ts'
import { fieldWindow, type TextField } from './field.ts'
import { joinText } from './joinText.ts'
import { padCell } from './padCell.ts'
import { plainText } from './plainText.ts'
import { styledText } from './styledText.ts'
import type { StyledText } from './types.ts'

const FIELD_LABEL_WIDTH = 14
const BRACKETS = 2

export function fieldInputLine(
  label: string,
  field: TextField,
  width: number,
  focused: boolean,
  color: boolean,
): StyledText {
  const marker = focused ? '>' : ' '
  const labelCell = padCell(`${marker} ${label}`, FIELD_LABEL_WIDTH)
  const valueWidth = Math.max(0, width - FIELD_LABEL_WIDTH - BRACKETS - 1)
  const value = `[${padCell(fieldWindow(field, valueWidth).text, valueWidth)}]`
  return joinText([
    plainText(' '),
    styledText(labelCell, focused ? ACCENT_HEX : MUTED_HEX, color),
    plainText(value),
  ])
}
