import { DIM_HEX, paint } from '../../output/color.ts'
import { padCell } from './padCell.ts'
import type { QueueWindow, RenderState } from './types.ts'
import { width } from './width.ts'

const ITEMS_KEYS = 'Enter/i detalhe · x/X arquivar · Esc/l volta'
const EN_DASH = '–'

export function itemsFooterLine(state: RenderState, window: QueueWindow, columns: number): string {
  const entries = state.items?.items ?? []
  const active = entries.filter((entry) => entry.item.status === 'active').length
  const archived = entries.length - active
  const totals = `${active} ativos, ${archived} arquivados`
  if (window.clipped && window.from !== null) {
    const withRange = `${ITEMS_KEYS} ${window.from}${EN_DASH}${window.to} de ${entries.length}  ·  ${totals}`
    if (width(withRange) <= columns) return paint(DIM_HEX, padCell(withRange, columns), state.color)
  }
  const gap = ' '.repeat(Math.max(1, columns - width(ITEMS_KEYS) - width(totals)))
  return paint(DIM_HEX, padCell(`${ITEMS_KEYS}${gap}${totals}`, columns), state.color)
}
