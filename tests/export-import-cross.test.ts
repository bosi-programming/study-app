import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { type Deps, type Item, type ReviewLog } from '../packages/core/src/index.ts'
import { applyDump } from '../apps/cli/src/model/import.ts'
import {
  dumpJsonV1 as cliDumpJsonV1,
  parseDumpV1 as cliParseDumpV1,
} from '../apps/cli/src/model/json.ts'
import { openStore as openCliStore } from '../apps/cli/src/persistence/store.ts'
import { exportDump, importDump } from '../apps/web/src/features/data/controller/service.ts'
import {
  toItemJson,
  toReviewLogJson,
  type ColdArchiveRecord,
} from '../apps/web/src/features/data/model/json.ts'
import { type IdbEnvironment } from '../apps/web/src/store/idb.ts'
import { openStore as openWebStore, type Store as WebStore } from '../apps/web/src/store/store.ts'

const STAMP = '2026-09-01T12:00:00Z'

function item(id: string, overrides: Partial<Omit<Item, 'id'>> = {}): Item {
  return {
    id,
    title: `Item ${id}`,
    subject: 'Cálculo',
    difficulty: 3,
    note: null,
    link: null,
    interval_days: 3,
    due_date: '2026-09-30',
    review_count: 0,
    on_time_streak: 0,
    status: 'active',
    last_reviewed_at: null,
    archived_at: null,
    cold_archived_at: null,
    created_at: STAMP,
    updated_at: STAMP,
    ...overrides,
  }
}

function log(
  id: string,
  itemId: string,
  overrides: Partial<Omit<ReviewLog, 'id' | 'item_id'>> = {},
): ReviewLog {
  return {
    id,
    item_id: itemId,
    reviewed_at: STAMP,
    due_date_at_review: '2026-09-06',
    interval_after: 6,
    review_count_after: 1,
    late: false,
    ...overrides,
  }
}

type Fixtures = {
  readonly active: Item
  readonly archived: Item
  readonly cold: Item
  readonly activeLog: ReviewLog
  readonly coldLog: ReviewLog
  readonly coldEntry: ColdArchiveRecord
}

function fixtures(): Fixtures {
  const active = item('active-1')
  const archived = item('archived-1', { status: 'archived', archived_at: STAMP })
  const cold = item('cold-1', { status: 'cold', cold_archived_at: STAMP, review_count: 1 })
  const activeLog = log('log-active', 'active-1')
  const coldLog = log('log-cold', 'cold-1', { reviewed_at: '2026-09-05T12:00:00Z' })
  const coldEntry: ColdArchiveRecord = {
    id: cold.id,
    payload: JSON.stringify({ item: toItemJson(cold), review_logs: [toReviewLogJson(coldLog)] }),
    cold_archived_at: STAMP,
  }
  return { active, archived, cold, activeLog, coldLog, coldEntry }
}

const webDeps: Deps = {
  clock: { nowUtc: () => '2026-10-01T12:00:00Z', todayLocalDate: () => '2026-10-01' },
  ids: () => 'id',
}

const cliDeps: Deps = {
  clock: { nowUtc: () => '2026-10-01T12:00:00Z', todayLocalDate: () => '2026-10-01' },
  ids: () => 'id',
}

function webEnvironment(): IdbEnvironment {
  return { factory: new IDBFactory(), keyRange: IDBKeyRange }
}

async function seedWeb(store: WebStore, data: Fixtures): Promise<void> {
  await store.transaction(async (scoped) => {
    await scoped.saveItem(data.active)
    await scoped.saveItem(data.archived)
    await scoped.saveItem(data.cold)
    await scoped.saveReviewLog(data.activeLog)
    await scoped.saveReviewLog(data.coldLog)
    await scoped.saveColdArchive(data.coldEntry)
    await scoped.setMeta('cold_archive_after_days', '90')
    await scoped.setMeta('locale', 'en-US')
    await scoped.setMeta('streak_current', '4')
    await scoped.setMeta('streak_last_day', '2026-09-12')
  })
}

describe('AC5 o arquivo do web abre no import do CLI', () => {
  it('crossArquivoDoWebAbreNoImportDoCli', async () => {
    const data = fixtures()
    const webStore = await openWebStore(webEnvironment(), 'web-cross-a')
    await seedWeb(webStore, data)
    const { text } = await exportDump(webStore, webDeps)
    webStore.close()

    const dir = mkdtempSync(join(tmpdir(), 'study-cross-'))
    try {
      const cliStore = openCliStore(join(dir, 'study.db'))
      try {
        const parsed = cliParseDumpV1(text, join(dir, 'web.json'))
        const counts = applyDump(cliStore, parsed)

        expect(counts.written).toBe(6)
        expect(cliStore.getItem('active-1')).toEqual(data.active)
        expect(cliStore.getItem('archived-1')).toEqual(data.archived)
        expect(cliStore.getItem('cold-1')).toEqual(data.cold)
        expect(cliStore.listReviewLogs('active-1')).toEqual([data.activeLog])
        expect(cliStore.listReviewLogs('cold-1')).toEqual([data.coldLog])
        expect(cliStore.listColdArchive()).toEqual([data.coldEntry])
        expect(cliStore.getMeta('cold_archive_after_days')).toBe('90')
        expect(cliStore.getMeta('locale')).toBe('en-US')
        expect(cliStore.getMeta('streak_current')).toBe('4')
        expect(cliStore.getMeta('streak_last_day')).toBe('2026-09-12')
      } finally {
        cliStore.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('AC5 o arquivo do CLI abre no import do web', () => {
  it('crossArquivoDoCliAbreNoImportDoWeb', async () => {
    const data = fixtures()
    const dir = mkdtempSync(join(tmpdir(), 'study-cross-'))
    try {
      const cliStore = openCliStore(join(dir, 'study.db'))
      cliStore.transaction(() => {
        cliStore.saveItem(data.active)
        cliStore.saveItem(data.archived)
        cliStore.saveItem(data.cold)
        cliStore.saveReviewLog(data.activeLog)
        cliStore.saveReviewLog(data.coldLog)
        cliStore.saveColdArchive(data.coldEntry)
        cliStore.setMeta('cold_archive_after_days', '90')
        cliStore.setMeta('locale', 'en-US')
        cliStore.setMeta('streak_current', '4')
        cliStore.setMeta('streak_last_day', '2026-09-12')
      })
      const text = JSON.stringify(cliDumpJsonV1(cliStore, cliDeps))
      cliStore.close()

      const webStore = await openWebStore(webEnvironment(), 'web-cross-b')
      try {
        const counts = await importDump(webStore, text)

        expect(counts.written).toBe(6)
        const items = await webStore.listItems()
        expect(items).toEqual([data.active, data.archived, data.cold])
        expect(await webStore.listReviewLogs('active-1')).toEqual([data.activeLog])
        expect(await webStore.listReviewLogs('cold-1')).toEqual([data.coldLog])
        expect(await webStore.listColdArchive()).toEqual([data.coldEntry])
        expect(await webStore.getMeta('locale')).toBe('en-US')
      } finally {
        webStore.close()
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
