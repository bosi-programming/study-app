import { headerLines } from './headerLines.ts'
import { itemsFooterLine } from './itemsFooterLine.ts'
import { itemsRows } from './itemsRows.ts'
import { ruleLine } from './ruleLine.ts'
import { scrollBars } from './scrollBars.ts'
import type { RenderState } from './types.ts'
import { windowRows } from './windowRows.ts'

export const ITEMS_CHROME = 3
export const ITEMS_TITLE = 'Fichas'

export function renderItems(state: RenderState): string[] {
  const { columns } = state.viewport
  const head = headerLines(state, ITEMS_TITLE)
  const window = windowRows(itemsRows(state), state, head.length + ITEMS_CHROME, state.items?.focusId ?? null)
  const bars = scrollBars(window, state.color)
  return [
    ...head,
    ruleLine(columns, state.utf8),
    ...bars.above,
    ...window.visible.map((row) => row.line),
    ...bars.below,
    ruleLine(columns, state.utf8),
    itemsFooterLine(state, window, columns),
  ]
}
