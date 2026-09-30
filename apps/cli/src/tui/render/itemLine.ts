import { type Item } from '@study/core'
import { ACCENT_HEX, DIM_HEX, MUTED_HEX, paint } from '../../output/color.ts'
import { dueColor } from './dueColor.ts'
import { dueText } from './dueText.ts'
import { padCell } from './padCell.ts'
import { paintCell } from './paintCell.ts'
import { subjectCell } from './subjectCell.ts'
import type { FrameWidths, RenderState } from './types.ts'

const INDEX_WIDTH = 4
const META_WIDTH = 7
const MARGIN = ' '

export function itemLine(number: number, item: Item, state: RenderState, widths: FrameWidths): string {
  const focused = item.id === state.focusId
  const prefix = focused ? `${paint(ACCENT_HEX, '>', state.color)} ` : '  '
  const index = paintCell(`${number}.`, INDEX_WIDTH, DIM_HEX, state.color)
  const subject = paintCell(subjectCell(item.subject, widths.subject), widths.subject, MUTED_HEX, state.color)
  const title = padCell(item.title, widths.title)
  const due = paintCell(dueText(item, state.today, !state.color), widths.due, dueColor(item, state.today), state.color)
  const meta = paintCell(`d${item.difficulty}  n=${item.review_count}`, META_WIDTH, DIM_HEX, state.color)
  return `${prefix}${index}${subject}${title}${due}${MARGIN}${meta}`
}
