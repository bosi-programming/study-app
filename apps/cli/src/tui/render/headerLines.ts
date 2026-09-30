import { ACCENT_HEX, MUTED_HEX, paint } from '../../output/color.ts'
import type { RenderState } from './types.ts'

const QUEUE_HEADER = 'Fila de hoje'

export function headerLines(state: RenderState): string[] {
  const lines = [paint(MUTED_HEX, `${QUEUE_HEADER} — ${state.today}`, state.color)]
  if (state.banner !== null) lines.push(paint(ACCENT_HEX, state.banner, state.color))
  return lines
}
