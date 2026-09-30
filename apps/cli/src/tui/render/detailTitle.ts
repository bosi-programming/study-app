import { DIM_HEX } from '../../output/color.ts'
import { joinText } from './joinText.ts'
import { padCell } from './padCell.ts'
import { plainText } from './plainText.ts'
import { styledText } from './styledText.ts'
import type { StyledText } from './types.ts'
import { truncate } from './truncate.ts'
import { width } from './width.ts'

const DETAIL_KEYS = 'Esc · i · q'

export function detailTitle(title: string, inner: number, color: boolean): StyledText {
  const room = inner - width(DETAIL_KEYS)
  const head = ` ${truncate(title, Math.max(0, room - 1))}`
  return joinText([plainText(padCell(head, Math.max(0, room))), styledText(DETAIL_KEYS, DIM_HEX, color)])
}
