import { itemLine } from './itemLine.ts'
import { ITEM_STATUS_WIDTH } from './itemsFrameWidths.ts'
import { paintCell } from './paintCell.ts'
import { statusColor } from './statusColor.ts'
import type { FrameWidths, RenderItemsItem, RenderState } from './types.ts'

export function itemsLine(
  number: number,
  entry: RenderItemsItem,
  state: RenderState,
  widths: FrameWidths,
): string {
  const line = itemLine(number, entry.item, state, widths, entry.focused)
  const status = paintCell(entry.item.status, ITEM_STATUS_WIDTH, statusColor(entry.item.status), state.color)
  return `${line} ${status}`
}
