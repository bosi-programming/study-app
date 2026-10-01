import { frameWidths } from './frameWidths.ts'
import { headerLines } from './headerLines.ts'
import { partitionQueue } from './partitionQueue.ts'
import { QUEUE_CHROME } from './renderQueue.ts'
import { sectionLines } from './sectionLines.ts'
import type { RenderState } from './types.ts'
import { windowRows } from './windowRows.ts'

export function queuePageSize(state: RenderState): number {
  const rows = sectionLines(state, frameWidths(state.viewport.columns), partitionQueue(state))
  return windowRows(rows, state, headerLines(state).length + QUEUE_CHROME).capacity
}
