import { ACCENT_HEX, SUCCESS_HEX, paint } from '../../output/color.ts'
import { itemLine } from './itemLine.ts'
import type { FrameWidths, QueuePartition, QueueRow, RenderState } from './types.ts'

const OVERDUE_LABEL = 'Atrasados'
const TODAY_LABEL = 'Hoje'

export function sectionLines(state: RenderState, widths: FrameWidths, partition: QueuePartition): QueueRow[] {
  const rows: QueueRow[] = []
  let number = 0

  if (partition.overdue.length > 0) {
    rows.push({ kind: 'other', line: paint(ACCENT_HEX, `${OVERDUE_LABEL} (${partition.overdue.length})`, state.color, true) })
    for (const item of partition.overdue) {
      number += 1
      rows.push({ kind: 'item', number, item, line: itemLine(number, item, state, widths) })
    }
  }

  if (partition.today.length > 0) {
    if (rows.length > 0) rows.push({ kind: 'other', line: '' })
    rows.push({ kind: 'other', line: paint(SUCCESS_HEX, `${TODAY_LABEL} (${partition.today.length})`, state.color, true) })
    for (const item of partition.today) {
      number += 1
      rows.push({ kind: 'item', number, item, line: itemLine(number, item, state, widths) })
    }
  }

  return rows
}
