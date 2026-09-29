import {
  DIFFICULTY_LABELS,
  type Item,
  type ItemStatus,
  type ReviewLog,
  daysLate,
  isLate,
} from '@study/core'
import { localDateOf } from '../deps.ts'
import {
  accent,
  accentStrong,
  danger,
  dim,
  heading,
  muted,
  success,
  successStrong,
} from './color.ts'

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
const CHECKIN_PREFIX = 'Check-in registrado:'
const NEXT_DUE_PREFIX = 'Próximo vencimento:'
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

export function itemTable(items: readonly Item[], today: string): string {
  if (items.length === 0) return EMPTY_RESULT

  const header = [
    heading(cell('ID', ID_WIDTH)),
    heading(cell('Matéria', SUBJECT_WIDTH)),
    heading(cell('Título', TITLE_WIDTH)),
    heading(cell('Vence', DUE_WIDTH)),
    heading(cell('Dificuldade', DIFFICULTY_WIDTH)),
    heading(cell('Check-ins', REVIEWS_WIDTH)),
    heading('Status'),
  ].join('  ')

  const rows = items.map((item) =>
    [
      dim(cell(idPrefix(item.id), ID_WIDTH)),
      cell(item.subject, SUBJECT_WIDTH),
      cell(item.title, TITLE_WIDTH),
      dueCell(item, today),
      dim(numberCell(item.difficulty, DIFFICULTY_WIDTH)),
      dim(numberCell(item.review_count, REVIEWS_WIDTH)),
      statusCell(item.status),
    ].join('  '),
  )

  return [header, ...rows].join('\n')
}

export function itemBlock(item: Item, today: string): string {
  const lines = [
    `${muted('ID:')}          ${item.id}`,
    `${muted('Título:')}      ${item.title}`,
    `${muted('Matéria:')}     ${item.subject}`,
    `${muted('Dificuldade:')} ${item.difficulty} — ${DIFFICULTY_LABELS[item.difficulty]}`,
    `${muted('Nota:')}        ${optional(item.note)}`,
    `${muted('Link:')}        ${optional(item.link)}`,
    `${muted('Vencimento:')}  ${dueLine(item, today)}`,
    `${muted('Intervalo:')}   ${item.interval_days}d`,
    `${muted('Check-ins:')}   ${item.review_count}`,
    `${muted('Status:')}      ${statusCell(item.status)}`,
  ]
  return lines.join('\n')
}

export function historySection(logs: readonly ReviewLog[]): string {
  const header = heading(`Histórico (${logs.length})`)
  if (logs.length === 0) return [header, dim(EMPTY_HISTORY)].join('\n')

  const rows = logs.map((log) => {
    const outcome = log.late ? accent('atrasado') : success('no prazo')
    const day = log.reviewed_at.slice(0, 10)
    return `  ${dim(day)}  n=${log.review_count_after}  intervalo ${log.interval_after}d  ${outcome}`
  })
  return [header, ...rows].join('\n')
}

export function createdLine(item: Item): string {
  return itemLine('Item criado:', item, successStrong)
}

export function updatedLine(item: Item): string {
  return itemLine('Item atualizado:', item, successStrong)
}

export function removedLine(item: Item): string {
  return itemLine('Item removido:', item, accentStrong)
}

export function archivedLine(item: Item): string {
  return itemLine('Item arquivado:', item, accentStrong)
}

export function unarchivedLine(item: Item): string {
  return itemLine('Item desarquivado:', item, successStrong)
}

export function restoredLine(item: Item): string {
  return itemLine('Item restaurado:', item, successStrong)
}

export function purgedLine(item: Item): string {
  return itemLine('Item removido do arquivo morto:', item, accentStrong)
}

export function configLine(key: string, value: number): string {
  return `${muted(`${key}:`)} ${value}`
}

export function migratedLine(count: number, path: string): string {
  return accent(`${count} itens migrados para o arquivo morto; export: ${path}`)
}

export function migrationFailedLine(path: string): string {
  return danger(`falha ao exportar o arquivo morto (${path}); nenhum item foi migrado`)
}

export function coldTable(items: readonly Item[]): string {
  if (items.length === 0) return EMPTY_COLD

  const header = [
    heading(cell('ID', ID_WIDTH)),
    heading(cell('Matéria', SUBJECT_WIDTH)),
    heading(cell('Título', TITLE_WIDTH)),
    heading(cell('Migrado em', COLD_DATE_WIDTH)),
    heading(cell('Dificuldade', DIFFICULTY_WIDTH)),
    heading(cell('Check-ins', REVIEWS_WIDTH)),
  ].join('  ')

  const rows = items.map((item) =>
    [
      dim(cell(idPrefix(item.id), ID_WIDTH)),
      cell(item.subject, SUBJECT_WIDTH),
      cell(item.title, TITLE_WIDTH),
      muted(cell(coldDate(item), COLD_DATE_WIDTH)),
      dim(numberCell(item.difficulty, DIFFICULTY_WIDTH)),
      dim(numberCell(item.review_count, REVIEWS_WIDTH)),
    ].join('  '),
  )

  return [header, ...rows].join('\n')
}

function coldDate(item: Item): string {
  return item.cold_archived_at === null ? ABSENT : localDateOf(item.cold_archived_at)
}

export function createdDbLine(dbPath: string): string {
  return `${muted('Banco criado em')} ${dbPath}`
}

export function resetDbLine(dbPath: string, backupPath: string): string {
  return `${muted('Banco recriado em')} ${dbPath}\n${muted('Backup:')} ${backupPath}`
}

export function exportedLine(path: string): string {
  return `${muted('Export:')} ${path}`
}

export function importedLine(items: number, checkins: number): string {
  return `${muted('Import:')} ${items} itens, ${checkins} check-ins`
}

function dueLine(item: Item, today: string): string {
  if (!isLate(item, today)) return item.due_date
  return `${accent(item.due_date)} ${accent(`(atrasado ${daysLate(item, today)}d)`)}`
}

function dueCell(item: Item, today: string): string {
  const text = cell(item.due_date, DUE_WIDTH)
  if (isLate(item, today)) return accent(text)
  return item.due_date === today ? success(text) : text
}

function statusCell(status: ItemStatus): string {
  if (status === 'active') return success(status)
  return dim(status)
}

function optional(value: string | null): string {
  return value === null ? dim(ABSENT) : value
}

function itemLine(label: string, item: Item, style: (text: string) => string): string {
  return `${style(label)} ${item.title} ${dim(`(${idPrefix(item.id)})`)}`
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
  const lines = [muted(`${QUEUE_HEADER} — ${today}`)]
  let index = 1

  if (overdue.length > 0) {
    lines.push('', accentStrong(`${OVERDUE_SECTION} (${overdue.length})`))
    for (const item of overdue) {
      lines.push(queueLine(index, item, today))
      index += 1
    }
  }

  if (dueToday.length > 0) {
    lines.push('', successStrong(`${TODAY_SECTION} (${dueToday.length})`))
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
  return `${muted(SUBJECT_SUMMARY_PREFIX)} ${subjectCountsText(bySubject)}`
}

function subjectCountsText(bySubject: Readonly<Record<string, number>>): string {
  return Object.entries(bySubject)
    .map(([subject, count]) => `${subject} ${count}`)
    .join(', ')
}

export function dueTotals(overdueCount: number, todayCount: number): string {
  return muted(`${overdueCount} atrasados, ${todayCount} para hoje.`)
}

export type StatsCounts = {
  readonly active: number
  readonly archived: number
  readonly cold: number
}

export function statsLines(
  currentStreak: number,
  items: StatsCounts,
  checkinsToday: number,
  bySubject: Readonly<Record<string, number>>,
): string {
  const total = Object.keys(bySubject).length === 0 ? ABSENT : subjectCountsText(bySubject)
  const streak = currentStreak > 0 ? successStrong(String(currentStreak)) : dim(String(currentStreak))
  const counts = `${muted(ACTIVE_PREFIX)}${items.active}${STATS_SEPARATOR}${muted(ARCHIVED_PREFIX)}${items.archived}${STATS_SEPARATOR}${muted(COLD_PREFIX)}${items.cold}`
  const checkins = `${muted(CHECKINS_TODAY_PREFIX)}${checkinsToday}${STATS_SEPARATOR}${muted(TOTAL_BY_SUBJECT_PREFIX)}${total}`

  return [
    `${muted(STREAK_PREFIX)}${streak}${muted(STREAK_SUFFIX)}`,
    counts,
    checkins,
  ].join('\n')
}

export function checkinLine(item: Item): string {
  return `${successStrong(CHECKIN_PREFIX)} ${item.title}`
}

export function nextDueLine(item: Item): string {
  const interval = accent(`(intervalo ${item.interval_days}d, n=${item.review_count})`)
  return `${muted(NEXT_DUE_PREFIX)} ${item.due_date} ${interval}`
}

function queueLine(index: number, item: Item, today: string): string {
  const label = queueLabel(index, item)
  const due = dueText(item, today).padEnd(QUEUE_DUE_WIDTH, ' ')
  const dueStyle = isLate(item, today) ? accent(due) : success(due)
  const meta = `${dim(`d${item.difficulty}`)}  ${dim(`n=${item.review_count}`)}`
  return `  ${label}  ${dueStyle}  ${meta}`
}

function dueText(item: Item, today: string): string {
  if (!isLate(item, today)) return TODAY_DUE_TEXT
  return `venceu ${item.due_date} (${daysLate(item, today)}d)`
}

function queueLabel(index: number, item: Item): string {
  const plain = `${index}. [${item.subject}] ${item.title}`
  if (plain.length > QUEUE_LABEL_WIDTH) return cell(plain, QUEUE_LABEL_WIDTH)
  const padding = ' '.repeat(QUEUE_LABEL_WIDTH - plain.length)
  return `${dim(`${index}.`)} [${item.subject}] ${item.title}${padding}`
}
