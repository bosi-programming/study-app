import { truncate } from './truncate.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import { width } from './width.ts'
import type { BoxOptions, RenderState } from './types.ts'

const COLD_TITLE = 'Arquivo morto'
const COLD_EMPTY = 'Nenhum item no arquivo morto.'
const COLD_HINT = 'R restaura · P purga · Esc/c volta'

export function renderCold(state: RenderState): string[] {
  const options = boxOptions(state)
  const cold = state.cold
  if (cold === null || cold.items.length === 0) {
    return renderBox(COLD_TITLE, [plainText(` ${COLD_EMPTY}`), plainText(''), plainText(` ${COLD_HINT}`)], options)
  }

  const lines = cold.items.map((entry) => {
    const marker = entry.focused ? '>' : ' '
    const date = entry.archivedOn === null ? '—' : entry.archivedOn
    const line = `${marker} ${truncate(entry.item.title, 30)}`
    const gap = ' '.repeat(Math.max(1, 40 - width(line)))
    return plainText(`${line}${gap}migrado em ${date}`)
  })
  return renderBox(COLD_TITLE, [...lines, plainText(''), plainText(` ${COLD_HINT}`)], options)
}

function boxOptions(state: RenderState): BoxOptions {
  return {
    columns: state.viewport.columns,
    rows: state.viewport.rows,
    utf8: state.utf8,
    color: state.color,
    banner: state.banner,
  }
}
