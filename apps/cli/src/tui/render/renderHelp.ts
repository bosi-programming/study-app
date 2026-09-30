import { MUTED_HEX } from '../../output/color.ts'
import { joinText } from './joinText.ts'
import { padCell } from './padCell.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import { styledText } from './styledText.ts'
import type { RenderState } from './types.ts'

const HELP_LABEL_WIDTH = 14
const HELP_TITLE = 'Ajuda'
const HELP_REMINDER = 'Os comandos de linha fazem o resto: add, edit, archive, cold, stats.'
const HELP_CLOSE = 'Esc · ? · q para fechar'
const HELP_KEYS: readonly (readonly [string, string])[] = [
  ['↑ ↓  k j', 'mover o foco na fila'],
  ['PgUp PgDn', 'rolar uma página'],
  ['g  G', 'primeiro e último item'],
  ['Enter', 'check-in do item em foco'],
  ['1–5', 'reavaliar a dificuldade'],
  ['i', 'abrir o detalhe'],
  ['Esc', 'fechar painel ou cancelar'],
  ['?', 'esta ajuda'],
  ['q', 'sair'],
  ['Ctrl-C', 'sair com 130'],
]

export function renderHelp(state: RenderState): string[] {
  const keys = HELP_KEYS.map(([label, description]) =>
    joinText([plainText(' '), styledText(padCell(label, HELP_LABEL_WIDTH), MUTED_HEX, state.color), plainText(description)]),
  )
  const body = [
    plainText(''),
    ...keys,
    plainText(''),
    plainText(` ${HELP_REMINDER}`),
    plainText(` ${HELP_CLOSE}`),
  ]
  return renderBox(HELP_TITLE, body, { columns: state.viewport.columns, rows: state.viewport.rows, utf8: state.utf8, color: state.color, banner: state.banner })
}
