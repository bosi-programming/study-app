import { MUTED_HEX } from '../../output/color.ts'
import { padCell } from './padCell.ts'
import { styledText } from './styledText.ts'
import type { StyledText } from './types.ts'
import { truncate } from './truncate.ts'

const FIELD_LABEL_WIDTH = 12

export function fieldLine(label: string, value: string, limit: number, color: boolean): StyledText {
  const labelCell = padCell(label, FIELD_LABEL_WIDTH)
  const valueCell = padCell(truncate(value, Math.max(0, limit - FIELD_LABEL_WIDTH)), Math.max(0, limit - FIELD_LABEL_WIDTH))
  return { plain: labelCell + valueCell, painted: styledText(labelCell, MUTED_HEX, color).painted + valueCell }
}
