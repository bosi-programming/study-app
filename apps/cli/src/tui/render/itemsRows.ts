import { itemsFrameWidths } from './itemsFrameWidths.ts'
import { itemsLine } from './itemsLine.ts'
import type { QueueRow, RenderState } from './types.ts'

export function itemsRows(state: RenderState): QueueRow[] {
  const entries = state.items?.items ?? []
  const widths = itemsFrameWidths(state.viewport.columns)
  return entries.map((entry, index) => ({
    kind: 'item',
    number: index + 1,
    item: entry.item,
    line: itemsLine(index + 1, entry, state, widths),
  }))
}
