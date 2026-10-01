import { clamp } from './clamp.ts'
import { focusIndex } from './focusIndex.ts'
import type { QueueRow, QueueWindow, RenderState } from './types.ts'

export function windowRows(rows: readonly QueueRow[], state: RenderState, chrome: number): QueueWindow {
  const available = state.viewport.rows - chrome
  const fits = rows.length <= available
  const capacity = Math.max(1, fits ? available : available - 2)
  const maxStart = Math.max(0, rows.length - capacity)
  const start = fits ? 0 : clamp(focusIndex(rows, state.focusId) - Math.floor(capacity / 2), 0, maxStart)
  const visible = rows.slice(start, start + capacity)
  const items = visible.filter((row) => row.kind === 'item')
  const first = items[0]
  const last = items[items.length - 1]
  return {
    visible,
    from: first === undefined ? null : first.number,
    to: last === undefined ? null : last.number,
    above: rows.slice(0, start).filter((row) => row.kind === 'item').length,
    below: rows.slice(start + capacity).filter((row) => row.kind === 'item').length,
    clipped: !fits,
    capacity,
  }
}
