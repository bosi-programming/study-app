import { DIFFICULTY_LABELS } from '@study/core'
import { DIM_HEX, MUTED_HEX } from '../../output/color.ts'
import { renderBox } from './renderBox.ts'
import { renderQueue } from './renderQueue.ts'
import { detailTitle } from './detailTitle.ts'
import { dueText } from './dueText.ts'
import { fieldRow } from './fieldRow.ts'
import { historyLine } from './historyLine.ts'
import { joinText } from './joinText.ts'
import { plainText } from './plainText.ts'
import { styledText } from './styledText.ts'
import type { RenderState } from './types.ts'

const ID_WIDTH = 8
const EMPTY_FIELD = '—'
const NO_HISTORY = 'nenhum check-in'
const DETAIL_TITLE = 'Detalhe'
const HISTORY_SCROLL_NOTE = 'As setas rolam o histórico quando ele passa da tela.'

export function renderDetail(state: RenderState): string[] {
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
