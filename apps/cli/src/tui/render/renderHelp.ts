import { MUTED_HEX } from '../../output/color.ts'
import { joinText } from './joinText.ts'
import { padCell } from './padCell.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import { styledText } from './styledText.ts'
import type { RenderState } from './types.ts'

const HELP_LABEL_WIDTH = 14
const HELP_TITLE = 'Ajuda'
const HELP_REMINDER = [
  ' Os comandos de linha continuam sendo a porta de script',
  ' e de leitor de tela: a TUI nunca é a única forma de',
  ' fazer algo.',
]
const HELP_CLOSE = 'Esc · ? · q para fechar'
const HELP_KEYS: readonly (readonly [string, string])[] = [
  ['↑ ↓  k j', 'mover o foco na fila'],
  ['PgUp PgDn g G', 'rolar e ir às pontas'],
  ['Enter', 'check-in do item em foco'],
  ['1–5', 'reavaliar a dificuldade'],
  ['i', 'abrir o detalhe'],
  ['a  e', 'item novo e edição do foco'],
  ['x  X', 'arquivar e desarquivar'],
  ['D', 'remover o item em foco'],
  ['c', 'arquivo morto'],
  ['C', 'config'],
  ['E  I', 'exportar e importar'],
  ['l', 'lista de todas as fichas'],
  ['R  P', 'restaurar e purgar no arquivo morto'],
  ['y  n', 'confirmar e cancelar'],
  ['Esc  ?', 'fechar painel ou esta ajuda'],
  ['q  Ctrl-C', 'sair (Ctrl-C sai 130)'],
]

export function renderHelp(state: RenderState): string[] {
  const keys = HELP_KEYS.map(([label, description]) =>
    joinText([plainText(' '), styledText(padCell(label, HELP_LABEL_WIDTH), MUTED_HEX, state.color), plainText(description)]),
  )
  const body = [
    plainText(''),
    ...keys,
    ...HELP_REMINDER.map((line) => plainText(line)),
    plainText(` ${HELP_CLOSE}`),
  ]
  return renderBox(HELP_TITLE, body, { columns: state.viewport.columns, rows: state.viewport.rows, utf8: state.utf8, color: state.color, banner: state.banner })
}
