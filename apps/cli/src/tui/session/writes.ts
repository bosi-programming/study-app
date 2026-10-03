import { existsSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { archiveItem, createItem, type Item, unarchiveItem } from '@study/core'
import { type ContextHookTarget } from '../../context.ts'
import { CliError } from '../../errors.ts'
import { restoreItem, purgeItem as purgeColdItem } from '../../model/coldArchive.ts'
import { updatedItem } from '../../model/editItem.ts'
import { writeJsonAtomic } from '../../model/file.ts'
import { applyDump, readDumpFile, validateReferences, type ImportCounts } from '../../model/import.ts'
import { dumpJsonV1 } from '../../model/json.ts'
import { COLD_ARCHIVE_AFTER_DAYS, parseColdArchiveWindow } from '../../model/config.ts'
import { fieldValues, patchOfForm } from './forms.ts'
import { type FormState } from './types.ts'

const ID_PREFIX_LENGTH = 8

export function id8(id: string): string {
  return id.slice(0, ID_PREFIX_LENGTH)
}

export function submitForm(target: ContextHookTarget, form: FormState): { readonly item: Item; readonly created: boolean } {
  if (form.mode === 'add') {
    const values = fieldValues(form)
    const item = createItem(
      {
        title: values.title,
        subject: values.subject,
        difficulty: Number(values.difficulty),
        note: values.note,
        link: values.link,
      },
      target.deps,
    )
    target.store.transaction(() => target.store.saveItem(item))
    return { item, created: true }
  }

  const current = form.itemId === null ? null : target.store.getItem(form.itemId)
  if (current === null) throw CliError.invalidState('item não encontrado para editar')
  const next = updatedItem(current, patchOfForm(form), target.deps)
  if (next !== current) target.store.transaction(() => target.store.saveItem(next))
  return { item: next, created: false }
}

export function archiveTarget(target: ContextHookTarget, item: Item): Item {
  if (item.status === 'archived') throw CliError.invalidState(`item já está arquivado: ${item.title}`)
  if (item.status === 'cold') throw CliError.invalidState(`item está no arquivo morto: ${item.title}`)
  const archived = archiveItem(item, target.deps.clock.nowUtc())
  target.store.transaction(() => target.store.saveItem(archived))
  return archived
}

export function unarchiveTarget(target: ContextHookTarget, item: Item): Item {
  if (item.status === 'active') throw CliError.invalidState(`item já está ativo: ${item.title}`)
  if (item.status === 'cold') throw CliError.invalidState(`item está no arquivo morto: ${item.title}`)
  const unarchived = unarchiveItem(item, target.deps.clock.nowUtc())
  target.store.transaction(() => target.store.saveItem(unarchived))
  return unarchived
}

export function removeTarget(target: ContextHookTarget, item: Item): void {
  target.store.transaction(() => target.store.deleteItem(item.id))
}

export function restoreColdItem(target: ContextHookTarget, item: Item): Item {
  if (item.status !== 'cold') throw CliError.invalidState(`item não está no arquivo morto: ${item.title}`)
  const restored = restoreItem(item, target.deps.clock.nowUtc())
  target.store.transaction(() => {
    target.store.saveItem(restored)
    target.store.deleteColdArchive(restored.id)
  })
  return restored
}

export function purgeCold(target: ContextHookTarget, item: Item): void {
  if (item.status !== 'cold') throw CliError.invalidState(`item não está no arquivo morto: ${item.title}`)
  purgeColdItem(target.store, item)
}

export function setConfigValue(target: ContextHookTarget, raw: string): number {
  const value = parseColdArchiveWindow(raw)
  if (value === null) throw CliError.invalidValue(`valor inválido para ${COLD_ARCHIVE_AFTER_DAYS}: ${raw}`)
  target.store.setMeta(COLD_ARCHIVE_AFTER_DAYS, String(value))
  return value
}

export function exportBlockedAsDatabase(target: ContextHookTarget, path: string): boolean {
  return realPathOf(path) === realPathOf(target.dbPath)
}

export function exportExists(path: string): boolean {
  return existsSync(path)
}

export function exportArchive(target: ContextHookTarget, path: string): void {
  if (exportBlockedAsDatabase(target, path)) throw CliError.invalidState(`arquivo de export é o banco: ${path}`)
  const dump = dumpJsonV1(target.store, target.deps)
  writeJsonAtomic(path, dump)
}

export function importArchive(target: ContextHookTarget, path: string): ImportCounts {
  const dump = readDumpFile(path)
  const localIds = new Set(target.store.listItems().map((item) => item.id))
  validateReferences(dump, localIds, path)
  return applyDump(target.store, dump)
}

function realPathOf(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}
