import { DIM_HEX, paint } from '../../output/color.ts'
import { padCell } from './padCell.ts'
import { totalsOf } from './totalsOf.ts'
import type { QueuePartition, QueueWindow, RenderState } from './types.ts'
import { width } from './width.ts'

const QUEUE_KEYS = 'Enter revisar · i detalhe · ? ajuda · q sair'
const EN_DASH = '–'

export function footerLine(state: RenderState, window: QueueWindow, columns: number, partition: QueuePartition): string {
  const { overdue, today } = totalsOf(partition)
  const totals = `${overdue} atrasados, ${today} para hoje`
  if (window.clipped && window.from !== null) {
    const withRange = `${QUEUE_KEYS} ${window.from}${EN_DASH}${window.to} de ${state.queue.length}  ·  ${totals}`
    if (width(withRange) <= columns) return paint(DIM_HEX, padCell(withRange, columns), state.color)
  }
  const gap = ' '.repeat(Math.max(1, columns - width(QUEUE_KEYS) - width(totals)))
  return paint(DIM_HEX, padCell(`${QUEUE_KEYS}${gap}${totals}`, columns), state.color)
}
