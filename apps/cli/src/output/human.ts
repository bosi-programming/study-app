import {
  DIFFICULTY_LABELS,
  type Item,
  type QueueStreak,
  type ReviewLog,
  daysLate,
  isLate,
} from '@study/core'
import { localDateOf } from '../deps.ts'

const ID_WIDTH = 8
const TITLE_WIDTH = 28
const SUBJECT_WIDTH = 14
const DUE_WIDTH = 10
const DIFFICULTY_WIDTH = 11
const REVIEWS_WIDTH = 9
const EMPTY_RESULT = 'Nenhum item.'
const EMPTY_COLD = 'Nenhum item no arquivo morto.'
const COLD_DATE_WIDTH = 12
const QUEUE_LABEL_WIDTH = 40
const QUEUE_DUE_WIDTH = 22
const CHECKIN_PREFIX = 'Check-in registrado: '
const NEXT_DUE_PREFIX = 'Próximo vencimento: '
const QUEUE_HEADER = 'Fila de hoje'
const OVERDUE_SECTION = 'Atrasados'
const TODAY_SECTION = 'Hoje'
const SUBJECT_SUMMARY_PREFIX = 'Por matéria:'
const STATS_SEPARATOR = '   '
const STREAK_PREFIX = 'Streak de fila zerada: '
const STREAK_SUFFIX = ' dias'
const ACTIVE_PREFIX = 'Ativos: '
const ARCHIVED_PREFIX = 'Arquivados: '
const COLD_PREFIX = 'Arquivo morto: '
const CHECKINS_TODAY_PREFIX = 'Check-ins hoje: '
const TOTAL_BY_SUBJECT_PREFIX = 'Total por matéria: '
const TODAY_DUE_TEXT = 'vence hoje'
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
    cell('Dificuldade', DIFFICULTY_WIDTH),
    cell('Check-ins', REVIEWS_WIDTH),
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

export function archivedLine(item: Item): string {
  return `Item arquivado: ${item.title} (${idPrefix(item.id)})`
}

export function unarchivedLine(item: Item): string {
  return `Item desarquivado: ${item.title} (${idPrefix(item.id)})`
}

export function restoredLine(item: Item): string {
  return `Item restaurado: ${item.title} (${idPrefix(item.id)})`
}

export function purgedLine(item: Item): string {
  return `Item removido do arquivo morto: ${item.title} (${idPrefix(item.id)})`
}

export function configLine(key: string, value: number): string {
  return `${key}: ${value}`
}

export function migratedLine(count: number, path: string): string {
  return `${count} itens migrados para o arquivo morto; export: ${path}`
}

export function migrationFailedLine(path: string): string {
  return `falha ao exportar o arquivo morto (${path}); nenhum item foi migrado`
}

export function coldTable(items: readonly Item[]): string {
  if (items.length === 0) return EMPTY_COLD

  const header = [
    cell('ID', ID_WIDTH),
    cell('Matéria', SUBJECT_WIDTH),
    cell('Título', TITLE_WIDTH),
    cell('Migrado em', COLD_DATE_WIDTH),
    cell('Dificuldade', DIFFICULTY_WIDTH),
    cell('Check-ins', REVIEWS_WIDTH),
  ].join('  ')

  const rows = items.map((item) =>
    [
      cell(idPrefix(item.id), ID_WIDTH),
      cell(item.subject, SUBJECT_WIDTH),
      cell(item.title, TITLE_WIDTH),
      cell(coldDate(item), COLD_DATE_WIDTH),
      numberCell(item.difficulty, DIFFICULTY_WIDTH),
      numberCell(item.review_count, REVIEWS_WIDTH),
    ].join('  '),
  )

  return [header, ...rows].join('\n')
}

function coldDate(item: Item): string {
  return item.cold_archived_at === null ? ABSENT : localDateOf(item.cold_archived_at)
}

export function createdDbLine(dbPath: string): string {
  return `Banco criado em ${dbPath}`
}

export function resetDbLine(dbPath: string, backupPath: string): string {
  return `Banco recriado em ${dbPath}\nBackup: ${backupPath}`
}

export function exportedLine(path: string): string {
  return `Export: ${path}`
}

export function importedLine(items: number, checkins: number): string {
  return `Import: ${items} itens, ${checkins} check-ins`
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

export type QueueSplit = {
  readonly overdue: readonly Item[]
  readonly dueToday: readonly Item[]
}

export function splitQueue(items: readonly Item[], today: string): QueueSplit {
  return {
    overdue: items.filter((item) => isLate(item, today)),
    dueToday: items.filter((item) => !isLate(item, today)),
  }
}

export function countBySubject(items: readonly Item[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) counts[item.subject] = (counts[item.subject] ?? 0) + 1
  return counts
}

export function dueQueue(
  overdue: readonly Item[],
  dueToday: readonly Item[],
  today: string,
  bySubject: Readonly<Record<string, number>>,
): string {
  const lines = [`${QUEUE_HEADER} — ${today}`]
  let index = 1

  if (overdue.length > 0) {
    lines.push('', `${OVERDUE_SECTION} (${overdue.length})`)
    for (const item of overdue) {
      lines.push(queueLine(index, item, today))
      index += 1
    }
  }

  if (dueToday.length > 0) {
    lines.push('', `${TODAY_SECTION} (${dueToday.length})`)
    for (const item of dueToday) {
      lines.push(queueLine(index, item, today))
      index += 1
    }
  }

  const summary = dueSummary(bySubject)
  lines.push('', ...(summary === null ? [] : [summary]), dueTotals(overdue.length, dueToday.length))
  return lines.join('\n')
}

export function dueSummary(bySubject: Readonly<Record<string, number>>): string | null {
  if (Object.keys(bySubject).length === 0) return null
  return `${SUBJECT_SUMMARY_PREFIX} ${subjectCountsText(bySubject)}`
}

export function subjectCountsText(bySubject: Readonly<Record<string, number>>): string {
  return Object.entries(bySubject)
    .map(([subject, count]) => `${subject} ${count}`)
    .join(', ')
}

export function dueTotals(overdueCount: number, todayCount: number): string {
  return `${overdueCount} atrasados, ${todayCount} para hoje.`
}

export type StatsCounts = {
  readonly active: number
  readonly archived: number
  readonly cold: number
}

export function statsLines(
  streak: QueueStreak,
  items: StatsCounts,
  checkinsToday: number,
  bySubject: Readonly<Record<string, number>>,
): string {
  const total = Object.keys(bySubject).length === 0 ? ABSENT : subjectCountsText(bySubject)
  const counts = `${ACTIVE_PREFIX}${items.active}${STATS_SEPARATOR}${ARCHIVED_PREFIX}${items.archived}${STATS_SEPARATOR}${COLD_PREFIX}${items.cold}`
  const checkins = `${CHECKINS_TODAY_PREFIX}${checkinsToday}${STATS_SEPARATOR}${TOTAL_BY_SUBJECT_PREFIX}${total}`

  return [
    `${STREAK_PREFIX}${streak.streak_current}${STREAK_SUFFIX}`,
    counts,
    checkins,
  ].join('\n')
}

export function checkinLine(item: Item): string {
  return `${CHECKIN_PREFIX}${item.title}`
}

export function nextDueLine(item: Item): string {
  return `${NEXT_DUE_PREFIX}${item.due_date} (intervalo ${item.interval_days}d, n=${item.review_count})`
}

function queueLine(index: number, item: Item, today: string): string {
  const label = cell(`${index}. [${item.subject}] ${item.title}`, QUEUE_LABEL_WIDTH)
  const due = dueText(item, today).padEnd(QUEUE_DUE_WIDTH, ' ')
  return `  ${label}  ${due}  d${item.difficulty}  n=${item.review_count}`
}

function dueText(item: Item, today: string): string {
  if (!isLate(item, today)) return TODAY_DUE_TEXT
  return `venceu ${item.due_date} (${daysLate(item, today)}d)`
}
