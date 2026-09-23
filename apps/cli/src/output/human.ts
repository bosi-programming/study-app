import { DIFFICULTY_LABELS, type Item, type ReviewLog, daysLate, isLate } from '@study/core'

const ID_WIDTH = 8
const TITLE_WIDTH = 28
const SUBJECT_WIDTH = 14
const DUE_WIDTH = 10
const DIFFICULTY_WIDTH = 10
const REVIEWS_WIDTH = 12
const EMPTY_RESULT = 'Nenhum item.'
const EMPTY_HISTORY = '  nenhum check-in'
const ABSENT = '—'
const ELLIPSIS = '…'

export function idPrefix(id: string): string {
  return id.slice(0, ID_WIDTH)
}

export function itemTable(items: readonly Item[]): string {
  if (items.length === 0) return EMPTY_RESULT

  const header = [
    cell('ID', ID_WIDTH),
    cell('Matéria', SUBJECT_WIDTH),
    cell('Título', TITLE_WIDTH),
    cell('Vence', DUE_WIDTH),
    cell('Difficulty', DIFFICULTY_WIDTH),
    cell('Review Count', REVIEWS_WIDTH),
    'Status',
  ].join('  ')

  const rows = items.map((item) =>
    [
      cell(idPrefix(item.id), ID_WIDTH),
      cell(item.subject, SUBJECT_WIDTH),
      cell(item.title, TITLE_WIDTH),
      cell(item.due_date, DUE_WIDTH),
      numberCell(item.difficulty, DIFFICULTY_WIDTH),
      numberCell(item.review_count, REVIEWS_WIDTH),
      item.status,
    ].join('  '),
  )

  return [header, ...rows].join('\n')
}

export function itemBlock(item: Item, today: string): string {
  const lines = [
    `ID:          ${item.id}`,
    `Título:      ${item.title}`,
    `Matéria:     ${item.subject}`,
    `Dificuldade: ${item.difficulty} — ${DIFFICULTY_LABELS[item.difficulty]}`,
    `Nota:        ${item.note ?? ABSENT}`,
    `Link:        ${item.link ?? ABSENT}`,
    `Vencimento:  ${dueLine(item, today)}`,
    `Intervalo:   ${item.interval_days}d`,
    `Check-ins:   ${item.review_count}`,
    `Status:      ${item.status}`,
  ]
  return lines.join('\n')
}

export function historySection(logs: readonly ReviewLog[]): string {
  const header = `Histórico (${logs.length})`
  if (logs.length === 0) return [header, EMPTY_HISTORY].join('\n')

  const rows = logs.map((log) => {
    const outcome = log.late ? 'atrasado' : 'no prazo'
    const day = log.reviewed_at.slice(0, 10)
    return `  ${day}  n=${log.review_count_after}  intervalo ${log.interval_after}d  ${outcome}`
  })
  return [header, ...rows].join('\n')
}

export function createdLine(item: Item): string {
  return `Item criado: ${item.title} (${idPrefix(item.id)})`
}

export function updatedLine(item: Item): string {
  return `Item atualizado: ${item.title} (${idPrefix(item.id)})`
}

export function removedLine(item: Item): string {
  return `Item removido: ${item.title} (${idPrefix(item.id)})`
}

export function createdDbLine(dbPath: string): string {
  return `Banco criado em ${dbPath}`
}

export function resetDbLine(dbPath: string, backupPath: string): string {
  return `Banco recriado em ${dbPath}\nBackup: ${backupPath}`
}

function dueLine(item: Item, today: string): string {
  if (!isLate(item, today)) return item.due_date
  return `${item.due_date} (atrasado ${daysLate(item, today)}d)`
}

function cell(value: string, width: number): string {
  if (value.length === width) return value
  if (value.length > width) return `${value.slice(0, width - 1)}${ELLIPSIS}`
  return value.padEnd(width, ' ')
}

function numberCell(value: number, width: number): string {
  return String(value).padStart(width, ' ')
}
