import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { errorOf, itemsOf, jsonOf, runStudy, seed } from './helpers.ts'

describe('AC3 — list filtra e ordena (RF-02, T-27)', () => {
  it('list-default-ativos: sem --status só os ativos aparecem', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Ativo' }),
          makeItem({ id: 'b', title: 'Arquivado', status: 'archived' }),
        ],
      })

      const result = runStudy(['list', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemsOf(result, 'list').map((item) => item.id)).toEqual(['a'])
    })
  })

  it('list-status-archived: devolve o arquivado', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Ativo' }),
          makeItem({ id: 'b', title: 'Arquivado', status: 'archived' }),
        ],
      })

      expect(
        itemsOf(runStudy(['list', '--status', 'archived', '--db', dbPath, '--json']), 'list').map(
          (item) => item.id,
        ),
      ).toEqual(['b'])
    })
  })

  it('list-filtra-materia: -s calculo casa com Cálculo pelo subjectKey', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Derivadas', subject: 'Cálculo' }),
          makeItem({ id: 'b', title: 'Phrasal verbs', subject: 'Inglês' }),
        ],
      })

      expect(
        itemsOf(runStudy(['list', '-s', 'calculo', '--db', dbPath, '--json']), 'list').map(
          (item) => item.id,
        ),
      ).toEqual(['a'])
    })
  })

  it('list-combina-materia-e-status: os dois filtros em AND', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Derivadas', subject: 'Cálculo' }),
          makeItem({ id: 'b', title: 'Integrais', subject: 'Cálculo', status: 'archived' }),
          makeItem({ id: 'c', title: 'Phrasal verbs', subject: 'Inglês' }),
        ],
      })

      expect(
        itemsOf(
          runStudy(['list', '-s', 'calculo', '--status', 'archived', '--db', dbPath, '--json']),
          'list',
        ).map((item) => item.id),
      ).toEqual(['b'])
    })
  })

  it('list-ordena: due_date e o id como desempate', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'A', due_date: '2026-09-10' }),
          makeItem({ id: 'b', title: 'B', due_date: '2026-09-05' }),
          makeItem({ id: 'c', title: 'C', due_date: '2026-09-10' }),
        ],
      })

      expect(
        itemsOf(runStudy(['list', '--db', dbPath, '--json']), 'list').map((item) => item.id),
      ).toEqual(['b', 'a', 'c'])
    })
  })

  it('list-status-cold: valor aceito, lista vazia, exit 0', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a' })] })

      const result = runStudy(['list', '--status', 'cold', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemsOf(result, 'list')).toEqual([])
    })
  })

  it('list-status-invalido: sai 2 com a mensagem do CLI.md', () => {
    withDb((dbPath) => {
      const result = runStudy(['list', '--status', 'bogus', '--db', dbPath, '--json'])

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-status',
        message: 'status inválido: use active, archived ou cold',
      })
    })
  })

  it('list-vazio: linha explícita no humano e lista vazia no JSON', () => {
    withDb((dbPath) => {
      const result = runStudy(['list', '--db', dbPath])
      const json = runStudy(['list', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(result.stdout.trim().length).toBeGreaterThan(0)
      expect(jsonOf(json)).toMatchObject({ list: { items: [] } })
    })
  })
})
