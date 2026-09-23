import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { makeItem, makeLog } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import {
  errorOf,
  itemOf,
  itemsOf,
  jsonOf,
  runStudy,
  seed,
  todayLocalDate,
  withStore,
} from './helpers.ts'

const COLD_STAMP = '2026-09-01T12:00:00Z'

function coldItem(id: string): ReturnType<typeof makeItem> {
  return makeItem({ id, status: 'cold', cold_archived_at: COLD_STAMP })
}

function archiveRow(id: string): { id: string; payload: string; cold_archived_at: string } {
  return { id, payload: JSON.stringify({ item: { id }, review_logs: [] }), cold_archived_at: COLD_STAMP }
}

describe('AC10 — cold list e cold restore (RF-17, RN-11, CA-10, T-08)', () => {
  it('cold-list-mostra-data: a data de migração aparece no humano e no --json', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [coldItem('a-1')] })

      const human = runStudy(['cold', 'list', '--db', dbPath])
      const json = runStudy(['cold', 'list', '--db', dbPath, '--json'])

      expect(human.status).toBe(0)
      expect(human.stdout).toContain('2026-09-01')
      expect(itemsOf(json, 'cold')[0]?.cold_archived_at).toBe(COLD_STAMP)
    })
  })

  it('cold-list-vazio: sem arquivo morto a linha é a do vazio', () => {
    withDb((dbPath) => {
      const human = runStudy(['cold', 'list', '--db', dbPath])
      const json = runStudy(['cold', 'list', '--db', dbPath, '--json'])

      expect(human.stdout).toContain('Nenhum item no arquivo morto.')
      expect(itemsOf(json, 'cold')).toEqual([])
    })
  })

  it('cold-restore-preserva: volta a active com o mesmo n e dificuldade e sem linha em cold_archive', () => {
    withDb((dbPath) => {
      const item = makeItem({
        id: 'a-1',
        status: 'cold',
        cold_archived_at: COLD_STAMP,
        review_count: 2,
        difficulty: 5,
        interval_days: 40,
      })
      seed(dbPath, { items: [item] })
      withStore(dbPath, (store) => store.saveColdArchive(archiveRow('a-1')))

      const result = runStudy(['cold', 'restore', 'a-1', '--db', dbPath, '--json'])
      const stored = withStore(dbPath, (store) => store.getItem('a-1'))

      expect(result.status).toBe(0)
      expect(stored).toMatchObject({
        status: 'active',
        review_count: 2,
        difficulty: 5,
        interval_days: 40,
        archived_at: null,
        cold_archived_at: null,
      })
      expect(withStore(dbPath, (store) => store.listColdArchive())).toEqual([])
    })
  })

  it('cold-restore-nao-cold: item ativo sai 3', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a-1' })] })

      const result = runStudy(['cold', 'restore', 'a-1', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({
        code: 'invalid-state',
        message: 'item não está no arquivo morto: a-1',
      })
    })
  })

  it('cold-restore-ref-nao-encontrada: ref inexistente sai 3', () => {
    withDb((dbPath) => {
      const result = runStudy(['cold', 'restore', 'deadbeef', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result).code).toBe('not-found')
    })
  })
})

describe('AC11 — cold purge (RF-17, critério 7)', () => {
  it('purge-sem-yes: exit 1, exige --yes e o item continua no arquivo morto', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [coldItem('a-1')] })
      withStore(dbPath, (store) => store.saveColdArchive(archiveRow('a-1')))

      const result = runStudy(['cold', 'purge', 'a-1', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result)).toEqual({ code: 'usage', message: 'cold purge exige --yes' })
      expect(itemsOf(runStudy(['cold', 'list', '--db', dbPath, '--json']), 'cold')).toHaveLength(1)
    })
  })

  it('purge-happy: some do arquivo morto, os logs caem e a linha de cold_archive some', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [coldItem('a-1')], logs: [makeLog({ id: 'log-a', item_id: 'a-1' })] })
      withStore(dbPath, (store) => store.saveColdArchive(archiveRow('a-1')))

      const result = runStudy(['cold', 'purge', 'a-1', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemsOf(runStudy(['cold', 'list', '--db', dbPath, '--json']), 'cold')).toEqual([])
      expect(withStore(dbPath, (store) => store.listReviewLogs('a-1'))).toEqual([])
      expect(withStore(dbPath, (store) => store.listColdArchive())).toEqual([])
      expect(withStore(dbPath, (store) => store.getItem('a-1'))).toBeNull()
    })
  })

  it('purge-deixa-o-export: o arquivo do export do dia fica no disco', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({
            id: 'a-1',
            status: 'archived',
            archived_at: `${addDays(todayLocalDate(), -181)}T12:00:00Z`,
          }),
        ],
      })
      runStudy(['list', '--db', dbPath, '--json'])
      const exportPath = join(
        dirname(dbPath),
        'exports',
        `cold-archive-${todayLocalDate()}.json`,
      )

      const result = runStudy(['cold', 'purge', 'a-1', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(existsSync(exportPath)).toBe(true)
    })
  })

  it('purge-nao-cold: item ativo sai 3 e nada muda', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1' })
      seed(dbPath, { items: [item] })

      const result = runStudy(['cold', 'purge', 'a-1', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(withStore(dbPath, (store) => store.getItem('a-1'))).toEqual(item)
    })
  })
})

describe('AC13 — a validação do subcomando', () => {
  it('cold-subcomando-desconhecido: exit 1', () => {
    withDb((dbPath) => {
      const result = runStudy(['cold', 'bogus', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
    })
  })
})

describe('AC14 — o envelope --json dos comandos novos (RNF-08, T-25)', () => {
  it('json-cold-list: raiz cold com action list e items', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [coldItem('a-1')] })

      const result = runStudy(['cold', 'list', '--db', dbPath, '--json'])
      const payload = jsonOf(result)['cold'] as Record<string, unknown>

      expect(payload['action']).toBe('list')
      expect((payload['items'] as unknown[]).length).toBe(1)
    })
  })

  it('json-cold-restore-purge: action nomeia o subcomando', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [coldItem('a-1'), coldItem('b-2')] })

      const restore = runStudy(['cold', 'restore', 'a-1', '--db', dbPath, '--json'])
      const purge = runStudy(['cold', 'purge', 'b-2', '--yes', '--db', dbPath, '--json'])

      expect((jsonOf(restore)['cold'] as Record<string, unknown>)['action']).toBe('restore')
      expect(itemOf(restore, 'cold')).toMatchObject({ id: 'a-1', status: 'active' })
      expect((jsonOf(purge)['cold'] as Record<string, unknown>)['action']).toBe('purge')
    })
  })
})
