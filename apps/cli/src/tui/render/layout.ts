import { type Item, daysLate, isLate } from '@study/core'
import { ACCENT_HEX, DIM_HEX, MUTED_HEX, SUCCESS_HEX } from '../../output/color.ts'
import { clamp, paintCell, padCell, paintIf, truncate, width } from './format.ts'
import { type RenderState } from './types.ts'

const FIXED_WIDTH = 14
const SUBJECT_RATIO = 0.22
const SUBJECT_MIN = 9
const SUBJECT_MAX = 15
const DUE_GAP = 12
const DUE_MIN = 23
const DUE_MAX = 28
const INDEX_WIDTH = 4
const META_WIDTH = 7
const MARGIN = ' '
const EN_DASH = '–'
const OVERDUE_LABEL = 'Atrasados'
const TODAY_LABEL = 'Hoje'
const OVERDUE_MARK = '!'
const OVERDUE_PREFIX = 'venceu '
const TODAY_TEXT = 'vence hoje'
const QUEUE_HEADER = 'Fila de hoje'
const QUEUE_KEYS = 'Enter revisar · i detalhe · ? ajuda · q sair'
const SCROLL_UP = '↑'
const SCROLL_DOWN = '↓'

export type FrameWidths = {
  readonly subject: number
  readonly title: number
  readonly due: number
}

export type QueueRow =
  | { readonly kind: 'item'; readonly number: number; readonly item: Item; readonly line: string }
  | { readonly kind: 'other'; readonly line: string }

export type QueueWindow = {
  readonly visible: readonly QueueRow[]
  readonly from: number | null
  readonly to: number | null
  readonly above: number
  readonly below: number
  readonly clipped: boolean
}

export type ScrollBars = {
  readonly above: readonly string[]
  readonly below: readonly string[]
}

export function frameWidths(columns: number): FrameWidths {
  const free = columns - FIXED_WIDTH
  const subject = clamp(Math.floor(free * SUBJECT_RATIO), SUBJECT_MIN, SUBJECT_MAX)
  const due = clamp(free - subject - DUE_GAP, DUE_MIN, DUE_MAX)
  return { subject, title: free - subject - due, due }
}

export function dueText(item: Item, today: string, mark: boolean): string {
  if (!isLate(item, today)) return item.due_date === today ? TODAY_TEXT : item.due_date
  return `${mark ? `${OVERDUE_MARK} ` : ''}${OVERDUE_PREFIX}${item.due_date} (${daysLate(item, today)}d)`
}

function dueColor(item: Item, today: string): string {
  if (isLate(item, today)) return ACCENT_HEX
  return item.due_date === today ? SUCCESS_HEX : MUTED_HEX
}

function subjectCell(subject: string, limit: number): string {
  const bracketed = `[${subject}]`
  if (width(bracketed) <= limit) return bracketed
  return `[${truncate(subject, limit - 3)}]`
}

function itemLine(number: number, item: Item, state: RenderState, widths: FrameWidths): string {
  const focused = item.id === state.focusId
  const prefix = focused ? `${paintIf(ACCENT_HEX, '>', state.color)} ` : '  '
  const index = paintCell(`${number}.`, INDEX_WIDTH, DIM_HEX, state.color)
  const subject = paintCell(subjectCell(item.subject, widths.subject), widths.subject, MUTED_HEX, state.color)
  const title = padCell(item.title, widths.title)
  const due = paintCell(dueText(item, state.today, true), widths.due, dueColor(item, state.today), state.color)
  const meta = paintCell(`d${item.difficulty}  n=${item.review_count}`, META_WIDTH, DIM_HEX, state.color)
  return `${prefix}${index}${subject}${title}${due}${MARGIN}${meta}`
}

export function sectionLines(state: RenderState, widths: FrameWidths): QueueRow[] {
  const overdue = state.queue.filter((item) => isLate(item, state.today))
  const today = state.queue.filter((item) => !isLate(item, state.today))
  const rows: QueueRow[] = []
  let number = 0

  if (overdue.length > 0) {
    rows.push({ kind: 'other', line: paintIf(ACCENT_HEX, `${OVERDUE_LABEL} (${overdue.length})`, state.color, true) })
    for (const item of overdue) {
      number += 1
      rows.push({ kind: 'item', number, item, line: itemLine(number, item, state, widths) })
    }
  }

  if (today.length > 0) {
    if (rows.length > 0) rows.push({ kind: 'other', line: '' })
    rows.push({ kind: 'other', line: paintIf(SUCCESS_HEX, `${TODAY_LABEL} (${today.length})`, state.color, true) })
    for (const item of today) {
      number += 1
      rows.push({ kind: 'item', number, item, line: itemLine(number, item, state, widths) })
    }
  }

  return rows
}

function focusIndex(rows: readonly QueueRow[], focusId: string | null): number {
  const index = rows.findIndex((row) => row.kind === 'item' && row.item.id === focusId)
  return index < 0 ? 0 : index
}

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
  }
}

export function scrollBars(window: QueueWindow, color: boolean): ScrollBars {
  return {
    above: window.above > 0 ? [paintIf(DIM_HEX, `${SCROLL_UP} ${window.above} acima`, color)] : [],
    below: window.below > 0 ? [paintIf(DIM_HEX, `${SCROLL_DOWN} ${window.below} abaixo`, color)] : [],
  }
}

function totalsOf(state: RenderState): { overdue: number; today: number } {
  const overdue = state.queue.filter((item) => isLate(item, state.today)).length
  return { overdue, today: state.queue.length - overdue }
}

export function headerLines(state: RenderState): string[] {
  const lines = [paintIf(MUTED_HEX, `${QUEUE_HEADER} — ${state.today}`, state.color)]
  if (state.banner !== null) lines.push(paintIf(ACCENT_HEX, state.banner, state.color))
  return lines
}

export function footerLine(state: RenderState, window: QueueWindow, columns: number): string {
  const { overdue, today } = totalsOf(state)
  const totals = `${overdue} atrasados, ${today} para hoje`
  if (window.clipped && window.from !== null) {
    const withRange = `${QUEUE_KEYS} ${window.from}${EN_DASH}${window.to} de ${state.queue.length}  ·  ${totals}`
    if (width(withRange) <= columns) return paintIf(DIM_HEX, padCell(withRange, columns), state.color)
  }
  const gap = ' '.repeat(Math.max(1, columns - width(QUEUE_KEYS) - width(totals)))
  return paintIf(DIM_HEX, padCell(`${QUEUE_KEYS}${gap}${totals}`, columns), state.color)
}
