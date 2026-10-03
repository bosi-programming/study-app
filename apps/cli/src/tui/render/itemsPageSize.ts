import { headerLines } from './headerLines.ts'
import { itemsRows } from './itemsRows.ts'
import { ITEMS_CHROME, ITEMS_TITLE } from './renderItems.ts'
import type { RenderState } from './types.ts'
import { windowRows } from './windowRows.ts'

export function itemsPageSize(state: RenderState): number {
  const rows = itemsRows(state)
  const chrome = headerLines(state, ITEMS_TITLE).length + ITEMS_CHROME
  return windowRows(rows, state, chrome, state.items?.focusId ?? null).capacity
}
