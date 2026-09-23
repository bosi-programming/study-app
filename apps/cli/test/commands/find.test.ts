import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, itemsOf, jsonOf, runStudy, seed } from './helpers.ts'

describe('AC4 — find busca por substring (RF-24, T-17)', () => {
  it('find-substring: deriv acha Derivadas parciais', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Derivadas parciais' }),
          makeItem({ id: 'b', title: 'Phrasal verbs' }),
        ],
      })

      const result = runStudy(['find', 'deriv', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemsOf(result, 'find').map((item) => item.id)).toEqual(['a'])
    })
  })

  it('find-sem-caixa: DERIVADA acha o mesmo item', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', title: 'Derivadas parciais' })] })

      expect(
        itemsOf(runStudy(['find', 'DERIVADA', '--db', dbPath, '--json']), 'find').map(
          (item) => item.id,
        ),
      ).toEqual(['a'])
    })
  })

  it('find-sem-acento: calculo acha Cálculo diferencial', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', title: 'Cálculo diferencial' })] })

      expect(
        itemsOf(runStudy(['find', 'calculo', '--db', dbPath, '--json']), 'find').map(
          (item) => item.id,
        ),
      ).toEqual(['a'])
    })
  })

  it('find-sem-resultado: linha explícita, lista vazia, exit 0', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', title: 'Derivadas parciais' })] })

      const human = runStudy(['find', 'inexistente', '--db', dbPath])
      const json = runStudy(['find', 'inexistente', '--db', dbPath, '--json'])

      expect(human.status).toBe(0)
      expect(human.stdout.trim().length).toBeGreaterThan(0)
      expect(jsonOf(json)).toMatchObject({ find: { items: [] } })
    })
  })

  it('find-nao-e-curinga: % só casa o % literal do título', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: '100% puro' }),
          makeItem({ id: 'b', title: '100 puro' }),
        ],
      })

      expect(
        itemsOf(runStudy(['find', '%', '--db', dbPath, '--json']), 'find').map((item) => item.id),
      ).toEqual(['a'])
    })
  })

  it('find-termo-vazio: sai 1 de uso', () => {
    withDb((dbPath) => {
      const result = runStudy(['find', '', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
    })
  })

  it('find-com-filtros: -s e --status chegam ao findItems', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Derivadas', subject: 'Cálculo' }),
          makeItem({ id: 'b', title: 'Derivadas', subject: 'Cálculo', status: 'archived' }),
          makeItem({ id: 'c', title: 'Derivadas', subject: 'Inglês' }),
        ],
      })

      expect(
        itemsOf(
          runStudy(['find', 'deriv', '-s', 'calculo', '--status', 'archived', '--db', dbPath, '--json']),
          'find',
        ).map((item) => item.id),
      ).toEqual(['b'])
    })
  })

  it('find-default-ativos: sem --status o arquivado não aparece', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Derivadas' }),
          makeItem({ id: 'b', title: 'Derivadas', status: 'archived' }),
        ],
      })

      expect(
        itemsOf(runStudy(['find', 'deriv', '--db', dbPath, '--json']), 'find').map(
          (item) => item.id,
        ),
      ).toEqual(['a'])
    })
  })
})
