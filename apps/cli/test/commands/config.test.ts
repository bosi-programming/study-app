import { addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, jsonOf, runStudy, seed, todayLocalDate, withStore } from './helpers.ts'

const KEY = 'cold_archive_after_days'

function stamp(days: number): string {
  return `${addDays(todayLocalDate(), days)}T12:00:00Z`
}

function statusOf(dbPath: string, id: string): string | null {
  return withStore(dbPath, (store) => store.getItem(id)?.status ?? null)
}

describe('AC12 — config e a janela (RF-25, CA-19, T-22, critério 8)', () => {
  it('config-get-padrao: sem meta a janela é 180', () => {
    withDb((dbPath) => {
      const human = runStudy(['config', 'get', KEY, '--db', dbPath])
      const json = runStudy(['config', 'get', KEY, '--db', dbPath, '--json'])
      const payload = jsonOf(json)['config'] as Record<string, unknown>

      expect(human.stdout).toContain(`${KEY}: 180`)
      expect(payload['value']).toBe(180)
    })
  })

  it('config-set-grava: set persiste e o get devolve o novo valor', () => {
    withDb((dbPath) => {
      const set = runStudy(['config', 'set', KEY, '90', '--db', dbPath, '--json'])
      const get = runStudy(['config', 'get', KEY, '--db', dbPath, '--json'])

      expect(set.status).toBe(0)
      expect((jsonOf(get)['config'] as Record<string, unknown>)['value']).toBe(90)
      expect(withStore(dbPath, (store) => store.getMeta(KEY))).toBe('90')
    })
  })

  it('config-set-migra-com-a-janela-antiga: o set usa 180 e só então grava 90', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a-1', status: 'archived', archived_at: stamp(-91) })] })

      runStudy(['config', 'set', KEY, '90', '--db', dbPath, '--json'])

      expect(statusOf(dbPath, 'a-1')).toBe('archived')
    })
  })

  it('config-set-proxima-execucao: a execução seguinte migra o item de 91 dias (CA-19)', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a-1', status: 'archived', archived_at: stamp(-91) })] })
      runStudy(['config', 'set', KEY, '90', '--db', dbPath, '--json'])

      runStudy(['list', '--db', dbPath, '--json'])

      expect(statusOf(dbPath, 'a-1')).toBe('cold')
    })
  })
})

describe('AC13 — a validação da chave, do valor e do subcomando', () => {
  it('config-chave-desconhecida: get e set de outra chave saem 2 e o meta fica intacto', () => {
    withDb((dbPath) => {
      withStore(dbPath, (store) => store.setMeta('locale', 'pt-BR'))

      const get = runStudy(['config', 'get', 'outra_chave', '--db', dbPath, '--json'])
      const set = runStudy(['config', 'set', 'outra_chave', '1', '--db', dbPath, '--json'])

      expect(get.status).toBe(2)
      expect(set.status).toBe(2)
      expect(withStore(dbPath, (store) => store.getMeta(KEY))).toBeNull()
      expect(withStore(dbPath, (store) => store.getMeta('locale'))).toBe('pt-BR')
    })
  })

  it('config-valor-invalido: abc, 0, -1 e 2.5 saem 2 e o meta fica intacto', () => {
    withDb((dbPath) => {
      const cases: readonly (readonly [string, readonly string[]])[] = [
        ['abc', ['abc']],
        ['0', ['0']],
        ['-1', ['--', '-1']],
        ['2.5', ['2.5']],
      ]
      for (const [value, argv] of cases) {
        const result = runStudy(['config', 'set', KEY, '--db', dbPath, '--json', ...argv])

        expect(result.status, value).toBe(2)
        expect(errorOf(result).code, value).toBe('invalid-value')
      }
      expect(withStore(dbPath, (store) => store.getMeta(KEY))).toBeNull()
    })
  })

  it('config-subcomando-desconhecido: exit 1', () => {
    withDb((dbPath) => {
      const result = runStudy(['config', 'bogus', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
    })
  })
})

describe('AC14 — o envelope --json dos comandos novos (RNF-08, T-25)', () => {
  it('json-config: raiz config com action, key e value', () => {
    withDb((dbPath) => {
      const get = jsonOf(runStudy(['config', 'get', KEY, '--db', dbPath, '--json']))
      const set = jsonOf(runStudy(['config', 'set', KEY, '120', '--db', dbPath, '--json']))

      expect(get['schema_version']).toBe(1)
      expect(get['config']).toEqual({ action: 'get', key: KEY, value: 180 })
      expect(set['config']).toEqual({ action: 'set', key: KEY, value: 120 })
    })
  })
})
