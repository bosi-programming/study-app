import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import {
  errorOf,
  historyOf,
  itemOf,
  itemsOf,
  jsonOf,
  queueOf,
  runStudy,
  seed,
  withStore,
} from './helpers.ts'

function queueIds(result: ReturnType<typeof runStudy>): string[] {
  const queue = queueOf(result)
  const overdue = queue['overdue'] as { id: string }[]
  const today = queue['today'] as { id: string }[]
  return [...overdue, ...today].map((entry) => entry.id)
}

describe('AC1 — archive muda o status e tira da fila (RF-14, RF-15, RN-09, T-06)', () => {
  it('archive-happy: exit 0, linha de confirmação e archived_at no store', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', title: 'Derivadas parciais' })
      seed(dbPath, { items: [item] })
      const ref = item.id.slice(0, 8)

      const human = runStudy(['archive', ref, '--db', dbPath])
      const stored = withStore(dbPath, (store) => store.getItem(item.id))

      expect(human.status).toBe(0)
      expect(human.stdout).toContain(`Item arquivado: ${item.title} (${ref})`)
      expect(stored?.status).toBe('archived')
      expect(stored?.archived_at).not.toBeNull()
    })
  })

  it('archive-sai-da-fila: some de due e do list default e aparece em --status archived', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', due_date: '2026-09-01' })
      seed(dbPath, { items: [item] })

      runStudy(['archive', item.id.slice(0, 8), '--db', dbPath, '--json'])

      expect(queueIds(runStudy(['due', '--db', dbPath, '--json']))).toEqual([])
      expect(itemsOf(runStudy(['list', '--db', dbPath, '--json']), 'list')).toEqual([])
      expect(
        itemsOf(runStudy(['list', '--status', 'archived', '--db', dbPath, '--json']), 'list').map(
          (entry) => entry.id,
        ),
      ).toEqual([item.id])
    })
  })

  it('archive-guarda-campos: só status, archived_at e updated_at mudam', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', review_count: 3, difficulty: 5, interval_days: 40 })
      seed(dbPath, { items: [item] })

      runStudy(['archive', item.id.slice(0, 8), '--db', dbPath, '--json'])
      const stored = withStore(dbPath, (store) => store.getItem(item.id))

      expect(stored).toMatchObject({
        review_count: 3,
        difficulty: 5,
        interval_days: 40,
        due_date: item.due_date,
        on_time_streak: item.on_time_streak,
      })
      expect(stored?.updated_at).not.toBe(item.updated_at)
    })
  })
})

describe('AC2 — unarchive devolve o item à fila (RF-14)', () => {
  it('unarchive-volta-a-fila: active, archived_at nulo e o vencido reaparece em due', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', due_date: '2026-09-01' })
      seed(dbPath, { items: [item] })
      runStudy(['archive', item.id.slice(0, 8), '--db', dbPath, '--json'])

      const result = runStudy(['unarchive', item.id.slice(0, 8), '--db', dbPath, '--json'])
      const stored = withStore(dbPath, (store) => store.getItem(item.id))

      expect(result.status).toBe(0)
      expect(stored?.status).toBe('active')
      expect(stored?.archived_at).toBeNull()
      expect(queueIds(runStudy(['due', '--db', dbPath, '--json']))).toEqual([item.id])
    })
  })
})

describe('AC3 — a máquina de estados recusa (casos de borda do Phase 1)', () => {
  it('archive-ja-arquivado: exit 3 e o item não muda', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', status: 'archived', archived_at: null })
      seed(dbPath, { items: [item] })
      const ref = item.id.slice(0, 8)

      const result = runStudy(['archive', ref, '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({
        code: 'invalid-state',
        message: `item já está arquivado: ${ref}`,
      })
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('archive-no-arquivo-morto: item cold manda usar cold restore', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', status: 'cold', cold_archived_at: '2026-09-01T00:00:00Z' })
      seed(dbPath, { items: [item] })
      const ref = item.id.slice(0, 8)

      const result = runStudy(['archive', ref, '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result).message).toBe(`item no arquivo morto; use study cold restore ${ref}`)
    })
  })

  it('unarchive-ja-ativo: exit 3 e o item não muda', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1' })
      seed(dbPath, { items: [item] })
      const ref = item.id.slice(0, 8)

      const result = runStudy(['unarchive', ref, '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({ code: 'invalid-state', message: `item já está ativo: ${ref}` })
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('unarchive-no-arquivo-morto: item cold manda usar cold restore', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', status: 'cold', cold_archived_at: '2026-09-01T00:00:00Z' })
      seed(dbPath, { items: [item] })
      const ref = item.id.slice(0, 8)

      const result = runStudy(['unarchive', ref, '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result).message).toBe(`item no arquivo morto; use study cold restore ${ref}`)
    })
  })

  it('archive-ref-nao-encontrada: exit 3', () => {
    withDb((dbPath) => {
      const result = runStudy(['archive', 'deadbeef', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({ code: 'not-found', message: 'item não encontrado: deadbeef' })
    })
  })

  it('archive-uso: sem ref ou com ref a mais sai 1 e nada persiste', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a-1' })] })

      const missing = runStudy(['archive', '--db', dbPath, '--json'])
      const extra = runStudy(['archive', 'a-1', 'b-2', '--db', dbPath, '--json'])

      expect(missing.status).toBe(1)
      expect(extra.status).toBe(1)
      expect(withStore(dbPath, (store) => store.listItems()).map((item) => item.status)).toEqual([
        'active',
      ])
    })
  })
})

describe('AC4 — o beco do ADR-019 fecha pela CLI (RF-09, CA-08)', () => {
  it('archive-depois-checkin-recusa: review sai 3, sem log novo e sem mudar n', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', review_count: 2 })
      seed(dbPath, { items: [item] })
      runStudy(['archive', item.id.slice(0, 8), '--db', dbPath, '--json'])

      const result = runStudy([
        'review',
        item.id.slice(0, 8),
        '-d',
        '4',
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(3)
      expect(errorOf(result).message).toBe('item arquivado; use study unarchive <ref>')
      expect(withStore(dbPath, (store) => store.getItem(item.id)?.review_count)).toBe(2)
      expect(withStore(dbPath, (store) => store.listReviewLogs(item.id))).toEqual([])
    })
  })

  it('desarquivado-checkin-volta: unarchive depois e o check-in passa', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', review_count: 2 })
      seed(dbPath, { items: [item] })
      runStudy(['archive', item.id.slice(0, 8), '--db', dbPath, '--json'])
      runStudy(['unarchive', item.id.slice(0, 8), '--db', dbPath, '--json'])

      const result = runStudy([
        'review',
        item.id.slice(0, 8),
        '-d',
        '4',
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(0)
      expect(withStore(dbPath, (store) => store.getItem(item.id)?.review_count)).toBe(3)
      expect(withStore(dbPath, (store) => store.listReviewLogs(item.id))).toHaveLength(1)
      expect(historyOf(runStudy(['show', item.id.slice(0, 8), '--history', '--db', dbPath, '--json']))).toHaveLength(1)
    })
  })
})

describe('AC14 — o envelope --json dos comandos novos (RNF-08, T-25)', () => {
  it('json-archive: raiz archive com action e item', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1' })
      seed(dbPath, { items: [item] })

      const result = runStudy(['archive', item.id.slice(0, 8), '--db', dbPath, '--json'])
      const payload = jsonOf(result)['archive'] as Record<string, unknown>

      expect(jsonOf(result)['schema_version']).toBe(1)
      expect(payload['action']).toBe('archive')
      expect((payload['item'] as { status: string }).status).toBe('archived')
      expect(itemOf(result, 'archive').id).toBe(item.id)
    })
  })

  it('json-unarchive: raiz unarchive com action e item', () => {
    withDb((dbPath) => {
      const item = makeItem({ id: 'a-1', status: 'archived', archived_at: null })
      seed(dbPath, { items: [item] })

      const result = runStudy(['unarchive', item.id.slice(0, 8), '--db', dbPath, '--json'])
      const payload = jsonOf(result)['unarchive'] as Record<string, unknown>

      expect(payload['action']).toBe('unarchive')
      expect((payload['item'] as { status: string }).status).toBe('active')
    })
  })
})

describe('apoio — uso', () => {
  it('usage-lista-os-novos: o USAGE traz archive, unarchive, cold e config', () => {
    const stdout = runStudy(['--help']).stdout

    expect(stdout).toContain('archive <ref>')
    expect(stdout).toContain('unarchive <ref>')
    expect(stdout).toContain('cold list')
    expect(stdout).toContain('config get <chave>')
  })
})
