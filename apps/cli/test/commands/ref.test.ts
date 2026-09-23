import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, itemsOf, runStudy, seed, withStore } from './helpers.ts'

const SCHEMA_FUTURE_MESSAGE = 'schema_version 2 não suportado'

describe('AC8 — resolução de <ref> (T-18, CA-18, RN-15)', () => {
  it('ref-uuid-exato: o UUID completo resolve', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['show', item.id, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
    })
  })

  it('ref-prefixo-4: um prefixo único de 4 caracteres resolve', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })

      const result = runStudy(['show', item.id.slice(0, 4), '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
    })
  })

  it('ref-titulo-normalizado: derivadas parciais acha Derivadas Parciais', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ title: 'Derivadas Parciais' })] })

      const result = runStudy(['show', 'derivadas parciais', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
    })
  })

  it('ref-curta-sem-correspondencia: sai 2 com referência inválida', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem()] })

      const result = runStudy(['show', 'abc', '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-ref',
        message: 'referência inválida: use um UUID, um prefixo de 4 ou mais caracteres ou o título exato',
      })
    })
  })

  it('ref-titulo-duplicado: sai 3 com os candidatos e sem escrita', () => {
    withDb((dbPath) => {
      const first = makeItem({ id: '11111111-1111-1111-1111-111111111111', subject: 'Cálculo' })
      const second = makeItem({ id: '22222222-2222-2222-2222-222222222222', subject: 'Inglês' })
      seed(dbPath, { items: [first, second] })

      const result = runStudy(['show', 'Derivadas parciais', '--db', dbPath, '--json'])
      const human = runStudy(['show', 'Derivadas parciais', '--db', dbPath])

      expect(result.status).toBe(3)
      expect(errorOf(result).code).toBe('ambiguous-ref')
      expect(result.stdout).toBe('')
      for (const output of [errorOf(result).message, human.stderr]) {
        expect(output).toContain('referência ambígua: Derivadas parciais')
        expect(output).toContain('11111111 [Cálculo] vence 2026-09-12')
        expect(output).toContain('22222222 [Inglês] vence 2026-09-12')
      }
      expect(itemsOf(runStudy(['list', '--db', dbPath, '--json']), 'list')).toHaveLength(2)
    })
  })

  it('ref-prefixo-ambiguo: dois ids com o mesmo começo saem 3 com a lista', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'abcd1111-1111-1111-1111-111111111111', title: 'Um' }),
          makeItem({ id: 'abcd2222-2222-2222-2222-222222222222', title: 'Dois' }),
        ],
      })

      const result = runStudy(['show', 'abcd', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result).message).toContain('abcd1111')
      expect(errorOf(result).message).toContain('abcd2222')
    })
  })
})

describe('AC10 — guarda de schema futuro (ADR-016)', () => {
  function seedFutureSchema(dbPath: string): void {
    withStore(dbPath, (store) => store.setMeta('schema_version', '2'))
  }

  it('schema-futuro-recusado: os sete comandos saem 2 antes da ação', () => {
    withDb((dbPath) => {
      seedFutureSchema(dbPath)
      const commands: Array<readonly string[]> = [
        ['init'],
        ['add', 'Título', '-s', 'Matéria', '-d', '4'],
        ['list'],
        ['find', 'deriv'],
        ['show', 'abcd'],
        ['edit', 'abcd', '-d', '5'],
        ['remove', 'abcd', '--yes'],
      ]

      for (const args of commands) {
        const result = runStudy([...args, '--db', dbPath, '--json'])
        expect(result.status, args[0]).toBe(2)
        expect(errorOf(result).message, args[0]).toBe(SCHEMA_FUTURE_MESSAGE)
      }
    })
  })

  it('schema-futuro-antes-da-acao: remove --yes não apaga o item', () => {
    withDb((dbPath) => {
      const item = makeItem()
      seed(dbPath, { items: [item] })
      seedFutureSchema(dbPath)

      const result = runStudy(['remove', item.id.slice(0, 8), '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(withStore(dbPath, (store) => store.getItem(item.id))).toEqual(item)
    })
  })

  it('schema-futuro-envelope: o erro sai no envelope de unsupported-schema', () => {
    withDb((dbPath) => {
      seedFutureSchema(dbPath)

      const result = runStudy(['list', '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(JSON.parse(result.stderr)).toEqual({
        error: { code: 'unsupported-schema', message: SCHEMA_FUTURE_MESSAGE },
      })
    })
  })

  it('schema-v1-aceito: banco criado pelo init responde 1 e os comandos funcionam', () => {
    withDb((dbPath) => {
      const init = runStudy(['init', '--db', dbPath, '--json'])
      const add = runStudy(['add', 'Título', '-s', 'Matéria', '-d', '4', '--db', dbPath, '--json'])

      expect(init.status).toBe(0)
      expect(withStore(dbPath, (store) => store.schemaVersion())).toBe(1)
      expect(add.status).toBe(0)
    })
  })
})
