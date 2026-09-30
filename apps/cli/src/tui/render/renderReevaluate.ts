import { frameWidths } from './frameWidths.ts'
import { headerLines } from './headerLines.ts'
import { padStyled } from './padStyled.ts'
import { partitionQueue } from './partitionQueue.ts'
import { reevaluateFooter } from './reevaluateFooter.ts'
import { ruleLine } from './ruleLine.ts'
import { scrollBars } from './scrollBars.ts'
import { sectionLines } from './sectionLines.ts'
import type { RenderState } from './types.ts'
import { windowRows } from './windowRows.ts'

const REEVALUATE_CHROME = 2

export function renderReevaluate(state: RenderState): string[] {
  const { columns } = state.viewport
  const head = headerLines(state)
  const footer = reevaluateFooter(state).map((line) => padStyled(line, columns).painted)
  const partition = partitionQueue(state)
  const window = windowRows(sectionLines(state, frameWidths(columns), partition), state, head.length + REEVALUATE_CHROME + footer.length)
  const bars = scrollBars(window, state.color)
  return [
    ...head,
    ruleLine(columns, state.utf8),
    ...bars.above,
    ...window.visible.map((row) => row.line),
    ...bars.below,
    ruleLine(columns, state.utf8),
    ...footer,
  ]
}
