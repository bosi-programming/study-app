import { boxOptions } from './boxOptions.ts'
import { truncate } from './truncate.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import { width } from './width.ts'
import type { RenderState } from './types.ts'

const COLD_TITLE = 'Arquivo morto'
const COLD_EMPTY = 'Nenhum item no arquivo morto.'
const COLD_HINT = 'R restaura · P purga · Esc/c volta'
const COLD_TITLE_WIDTH = 30
const COLD_GAP_WIDTH = 40

export function renderCold(state: RenderState): string[] {
  const options = boxOptions(state)
  const cold = state.cold
  if (cold === null || cold.items.length === 0) {
    return renderBox(COLD_TITLE, [plainText(` ${COLD_EMPTY}`), plainText(''), plainText(` ${COLD_HINT}`)], options)
  }

  const lines = cold.items.map((entry) => {
    const marker = entry.focused ? '>' : ' '
    const date = entry.archivedOn === null ? '—' : entry.archivedOn
    const line = `${marker} ${truncate(entry.item.title, COLD_TITLE_WIDTH)}`
    const gap = ' '.repeat(Math.max(1, COLD_GAP_WIDTH - width(line)))
    return plainText(`${line}${gap}migrado em ${date}`)
  })
  return renderBox(COLD_TITLE, [...lines, plainText(''), plainText(` ${COLD_HINT}`)], options)
}
