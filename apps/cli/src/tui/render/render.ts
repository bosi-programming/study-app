import { DIFFICULTY_LABELS } from '@study/core'
import { ACCENT_HEX, DIM_HEX, MUTED_HEX, SUCCESS_HEX } from '../../output/color.ts'
import { renderBox } from './box.ts'
import {
  type StyledText,
  centerLine,
  joinText,
  padCell,
  padStyled,
  plainText,
  ruleLine,
  styledText,
  truncate,
  width,
} from './format.ts'
import {
  dueText,
  footerLine,
  frameWidths,
  headerLines,
  scrollBars,
  sectionLines,
  windowRows,
} from './layout.ts'
import { type RenderDetail, type RenderState } from './types.ts'

const MIN_COLUMNS = 60
const MIN_ROWS = 15
const ID_WIDTH = 8
const FIELD_LABEL_WIDTH = 12
const HELP_LABEL_WIDTH = 14
const EN_DASH = '–'
const EMPTY_FIELD = '—'
const NO_HISTORY = 'nenhum check-in'
const EMPTY_TITLE = 'Fila zerada'
const EMPTY_KEYS = '? ajuda · q sair'
const SMALL_FIRST = 'Aumente a janela para pelo menos'
const SMALL_SECOND = '60 colunas e 15 linhas.'
const DETAIL_TITLE = 'Detalhe'
const DETAIL_KEYS = 'Esc · i · q'
const HISTORY_SCROLL_NOTE = 'As setas rolam o histórico quando ele passa da tela.'
const HELP_TITLE = 'Ajuda'
const HELP_REMINDER = 'Os comandos de linha fazem o resto: add, edit, archive, cold, stats.'
const HELP_CLOSE = 'Esc · ? · q para fechar'
const REEVALUATE_CANCEL = 'Esc cancela · Enter mantém · 1–5 recalcula'
const CONFIRMATION_PREFIX = '✓ Check-in registrado:'

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

const CHOICES = `  1 ${DIFFICULTY_LABELS[1]}   2 ${DIFFICULTY_LABELS[2]}   3 ${DIFFICULTY_LABELS[3]}   4 ${DIFFICULTY_LABELS[4]}   5 ${DIFFICULTY_LABELS[5]}`

export function render(state: RenderState): string {
  if (state.fatal !== null) return ''

  const { columns, rows } = state.viewport
  if (columns < MIN_COLUMNS || rows < MIN_ROWS) return renderSmall(columns)

  switch (state.screen) {
    case 'detail':
      return renderDetail(state).join('\n')
    case 'help':
      return renderHelp(state).join('\n')
    case 'reevaluate':
      return renderReevaluate(state).join('\n')
    case 'queue':
      return (state.queue.length === 0 ? renderEmpty(state) : renderQueue(state)).join('\n')
  }
}

function renderSmall(columns: number): string {
  return [truncate(SMALL_FIRST, columns), truncate(SMALL_SECOND, columns)].join('\n')
}

function renderQueue(state: RenderState): string[] {
  const { columns } = state.viewport
  const head = headerLines(state)
  const window = windowRows(sectionLines(state, frameWidths(columns)), state, head.length + 3)
  const bars = scrollBars(window, state.color)
  return [
    ...head,
    ruleLine(columns, state.utf8),
    ...bars.above,
    ...window.visible.map((row) => row.line),
    ...bars.below,
    ruleLine(columns, state.utf8),
    footerLine(state, window, columns),
  ]
}

function renderEmpty(state: RenderState): string[] {
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

function detailTitle(title: string, inner: number, color: boolean): StyledText {
  const room = inner - width(DETAIL_KEYS)
  const head = ` ${truncate(title, Math.max(0, room - 1))}`
  return joinText([plainText(padCell(head, Math.max(0, room))), styledText(DETAIL_KEYS, DIM_HEX, color)])
}

function fieldLine(label: string, value: string, limit: number, color: boolean): StyledText {
  const labelCell = padCell(label, FIELD_LABEL_WIDTH)
  const valueCell = padCell(truncate(value, Math.max(0, limit - FIELD_LABEL_WIDTH)), Math.max(0, limit - FIELD_LABEL_WIDTH))
  return { plain: labelCell + valueCell, painted: styledText(labelCell, MUTED_HEX, color).painted + valueCell }
}

function fieldRow(
  left: readonly [string, string],
  right: readonly [string, string] | null,
  leftWidth: number,
  rightWidth: number,
  color: boolean,
): StyledText {
  const leftCell = fieldLine(left[0], left[1], leftWidth, color)
  if (right === null) return joinText([plainText(' '), leftCell])
  return joinText([plainText(' '), leftCell, plainText(' '), fieldLine(right[0], right[1], rightWidth, color)])
}

function historyLine(log: RenderDetail['history'][number], color: boolean): StyledText {
  const outcome = log.late ? 'atrasado' : 'no prazo'
  return joinText([
    plainText('  '),
    styledText(log.reviewed_at.slice(0, 10), DIM_HEX, color),
    plainText(`  n=${log.review_count_after}  intervalo ${log.interval_after}d  `),
    styledText(outcome, log.late ? ACCENT_HEX : SUCCESS_HEX, color),
  ])
}

function renderDetail(state: RenderState): string[] {
  const detail = state.detail
  const { columns } = state.viewport
  if (detail === null) return renderQueue(state)
  const item = detail.item
  const inner = columns - 2
  const column = Math.floor((inner - 2) / 2)
  const fields = [
    fieldRow(['Dificuldade', `${item.difficulty} — ${DIFFICULTY_LABELS[item.difficulty]}`], ['Vencimento', dueText(item, state.today, false)], column, column, state.color),
    fieldRow(['Intervalo', `${item.interval_days}d`], ['Check-ins', String(item.review_count)], column, column, state.color),
    fieldRow(['Nota', item.note ?? EMPTY_FIELD], ['Link', item.link ?? EMPTY_FIELD], column, column, state.color),
    fieldRow(['Status', item.status], null, column, column, state.color),
  ]
  const history = detail.history.length === 0
    ? [joinText([plainText('  '), styledText(NO_HISTORY, DIM_HEX, state.color)])]
    : detail.history.map((log) => historyLine(log, state.color))
  const body = [
    plainText(''),
    detailTitle(item.title, inner, state.color),
    plainText(` [${item.subject}]   ${item.id.slice(0, ID_WIDTH)}`),
    plainText(''),
    ...fields,
    plainText(''),
    joinText([plainText(' '), styledText(`Histórico (${detail.history.length})`, MUTED_HEX, state.color, true)]),
    ...history,
    plainText(''),
    joinText([plainText(' '), styledText(HISTORY_SCROLL_NOTE, DIM_HEX, state.color)]),
  ]
  return renderBox(DETAIL_TITLE, body, { columns, rows: state.viewport.rows, utf8: state.utf8, color: state.color, banner: state.banner })
}

function renderHelp(state: RenderState): string[] {
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

function reevaluateFooter(state: RenderState): StyledText[] {
  const difficulty = state.reevaluation?.currentDifficulty ?? 1
  const lines: StyledText[] = []
  if (state.confirmation !== null) {
    lines.push(joinText([
      styledText(CONFIRMATION_PREFIX, SUCCESS_HEX, state.color, true),
      plainText(` ${state.confirmation}`),
    ]))
  }
  lines.push(plainText(`Dificuldade atual: ${difficulty} — ${DIFFICULTY_LABELS[difficulty]}  ·  Enter mantém, ou escolha 1${EN_DASH}5:`))
  lines.push(plainText(CHOICES))
  lines.push(plainText(REEVALUATE_CANCEL))
  return lines
}

function renderReevaluate(state: RenderState): string[] {
  const { columns } = state.viewport
  const head = headerLines(state)
  const footer = reevaluateFooter(state).map((line) => padStyled(line, columns).painted)
  const window = windowRows(sectionLines(state, frameWidths(columns)), state, head.length + 2 + footer.length)
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
