import { type CommandView } from '../model/results.ts'
import {
  archivedLine,
  coldTable,
  configLine,
  createdDbLine,
  createdLine,
  dueQueue,
  exportedLine,
  historySection,
  importedLine,
  itemBlock,
  itemTable,
  nextDueLine,
  purgedLine,
  removedLine,
  resetDbLine,
  restoredLine,
  statsLines,
  unarchivedLine,
  updatedLine,
} from './human.ts'

export function render(view: CommandView): string {
  switch (view.kind) {
    case 'db-created':
      return createdDbLine(view.dbPath)
    case 'db-reset':
      return resetDbLine(view.dbPath, view.backupPath)
    case 'item-created':
      return createdLine(view.item)
    case 'items':
      return itemTable(view.items, view.today)
    case 'queue':
      return dueQueue(view.overdue, view.dueToday, view.today, view.bySubject)
    case 'item-reviewed':
      return nextDueLine(view.item)
    case 'item-detail':
      return view.history === null
        ? itemBlock(view.item, view.today)
        : `${itemBlock(view.item, view.today)}\n\n${historySection(view.history)}`
    case 'item-updated':
      return updatedLine(view.item)
    case 'item-removed':
      return removedLine(view.item)
    case 'item-archived':
      return archivedLine(view.item)
    case 'item-unarchived':
      return unarchivedLine(view.item)
    case 'cold-items':
      return coldTable(view.items)
    case 'item-restored':
      return restoredLine(view.item)
    case 'item-purged':
      return purgedLine(view.item)
    case 'config-value':
      return configLine(view.key, view.value)
    case 'stats':
      return statsLines(view.currentStreak, view.items, view.checkinsToday, view.bySubject)
    case 'exported':
      return exportedLine(view.path)
    case 'imported':
      return importedLine(view.items, view.checkins)
    default: {
      const exhaustive: never = view
      throw new Error(`view desconhecida: ${JSON.stringify(exhaustive)}`)
    }
  }
}
