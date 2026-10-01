import { type Deps } from '@study/core'
import { type FileGateway } from '../../../files.ts'
import { type IdbEnvironment, type Store, openStore } from '../../../store/index.ts'
import { type DataCounts } from '../model/dataView.ts'
import { type DumpJsonV1, type DumpSnapshot, dumpJsonV1, parseDumpV1 } from '../model/json.ts'
import {
  META_KEYS,
  type ImportCounts,
  mergeColdArchive,
  mergeItems,
  mergeMeta,
  mergeReviewLogs,
  validateReferences,
} from '../model/merge.ts'

export function dumpFileName(today: string): string {
  return `study-${today}.json`
}

export async function exportDump(
  store: Store,
  deps: Deps,
): Promise<{ readonly text: string; readonly counts: DataCounts }> {
  const dump = dumpJsonV1(await readSnapshot(store, deps))
  return { text: JSON.stringify(dump), counts: countsOf(dump) }
}

export async function importDump(store: Store, text: string): Promise<ImportCounts> {
  const dump = parseDumpV1(text)
  return store.transaction(async (scoped) => {
    const [items, reviewLogs, coldArchive] = await Promise.all([
      scoped.listItems(),
      scoped.listReviewLogs(),
      scoped.listColdArchive(),
    ])
    validateReferences(dump, new Set(items.map((item) => item.id)))
    const itemPlan = mergeItems(dump, items)
    const logPlan = mergeReviewLogs(dump, reviewLogs)
    const coldPlan = mergeColdArchive(dump, coldArchive)
    for (const item of itemPlan.write) await scoped.saveItem(item)
    for (const log of logPlan.write) await scoped.saveReviewLog(log)
    for (const entry of coldPlan.write) await scoped.saveColdArchive(entry)
    for (const meta of mergeMeta(dump)) await scoped.setMeta(meta.key, meta.value)
    return {
      items: itemPlan.write.length,
      reviewLogs: logPlan.write.length,
      coldArchive: coldPlan.write.length,
      written: itemPlan.write.length + logPlan.write.length + coldPlan.write.length,
      skipped: itemPlan.skipped + logPlan.skipped + coldPlan.skipped,
    }
  })
}

export async function exportRelaxed(
  environment: IdbEnvironment,
  name: string,
  deps: Deps,
  files: FileGateway,
): Promise<void> {
  const store = await openStore(environment, name, { checkSchema: false })
  try {
    const { text } = await exportDump(store, deps)
    await files.saveFile(dumpFileName(deps.clock.todayLocalDate()), text)
  } finally {
    store.close()
  }
}

async function readSnapshot(store: Store, deps: Deps): Promise<DumpSnapshot> {
  const [items, reviewLogs, coldArchive, meta] = await Promise.all([
    store.listItems(),
    store.listReviewLogs(),
    store.listColdArchive(),
    readMeta(store),
  ])
  return { exportedAt: deps.clock.nowUtc(), meta, items, reviewLogs, coldArchive }
}

async function readMeta(store: Store): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    META_KEYS.map(async (key) => [key, await store.getMeta(key)] as const),
  )
  return Object.fromEntries(entries)
}

function countsOf(dump: DumpJsonV1): DataCounts {
  const items = dump.items.length
  const reviewLogs = dump.review_logs.length
  const coldArchive = dump.cold_archive.length
  return { items, reviewLogs, coldArchive, written: items + reviewLogs + coldArchive, skipped: 0 }
}
