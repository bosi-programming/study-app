import { centerLine } from './centerLine.ts'
import { headerLines } from './headerLines.ts'
import { ruleLine } from './ruleLine.ts'
import type { RenderState } from './types.ts'

const EMPTY_TITLE = 'Fila zerada'
const EMPTY_KEYS = '? ajuda · q sair'

export function renderEmpty(state: RenderState): string[] {
  const { columns, rows } = state.viewport
  const head = headerLines(state)
  const bodyHeight = Math.max(0, rows - head.length - 2)
  const streak = state.streak.streak_current === 1 ? 'dia' : 'dias'
  const group = [
    centerLine(`${EMPTY_TITLE} — streak de ${state.streak.streak_current} ${streak}`, columns),
    '',
    centerLine(EMPTY_KEYS, columns),
  ]
  const top = Math.max(0, Math.floor((bodyHeight - group.length) / 2))
  const body = [...Array.from({ length: top }, () => ''), ...group]
  const bottom = Math.max(0, bodyHeight - body.length)
  return [
    ...head,
    ruleLine(columns, state.utf8),
    ...body,
    ...Array.from({ length: bottom }, () => ''),
    ruleLine(columns, state.utf8),
  ]
}
