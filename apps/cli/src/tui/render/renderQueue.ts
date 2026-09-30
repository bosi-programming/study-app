import { footerLine } from './footerLine.ts'
import { frameWidths } from './frameWidths.ts'
import { headerLines } from './headerLines.ts'
import { partitionQueue } from './partitionQueue.ts'
import { ruleLine } from './ruleLine.ts'
import { scrollBars } from './scrollBars.ts'
import { sectionLines } from './sectionLines.ts'
import type { RenderState } from './types.ts'
import { windowRows } from './windowRows.ts'

const QUEUE_CHROME = 3

export function renderQueue(state: RenderState): string[] {
  const { columns } = state.viewport
  const head = headerLines(state)
  const partition = partitionQueue(state)
  const window = windowRows(sectionLines(state, frameWidths(columns), partition), state, head.length + QUEUE_CHROME)
  const bars = scrollBars(window, state.color)
  return [
    ...head,
    ruleLine(columns, state.utf8),
    ...bars.above,
    ...window.visible.map((row) => row.line),
    ...bars.below,
    ruleLine(columns, state.utf8),
    footerLine(state, window, columns, partition),
  ]
}
