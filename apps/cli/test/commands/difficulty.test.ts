import { type ReevaluateFixture, goldenFixtures } from '@study/golden'
import { intervalFor, toDifficulty } from '@study/core'
import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import {
  errorOf,
  itemOf,
  jsonOf,
  rebaseDelta,
  rebasedDate,
  runStudy,
  seed,
  todayLocalDate,
} from './helpers.ts'

const fixturesByCase = new Map(goldenFixtures.map((fixture) => [fixture.case, fixture]))

function reevaluateFixture(name: string): ReevaluateFixture {
  const fixture = fixturesByCase.get(name)
  if (fixture === undefined || fixture.kind !== 'reevaluate') {
    throw new Error(`fixture ausente: ${name}`)
  }
  return fixture
}

describe('AC9 — difficulty reavalia (RF-11, ADR-019)', () => {
  it('difficulty-reavalia: reusa o n e conta o vencimento novo de hoje', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [makeItem({ id: 'a', difficulty: 4, review_count: 2, interval_days: 12, due_date: '2026-09-01' })],
      })

      const result = runStudy(['difficulty', 'a', '2', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'difficulty')).toMatchObject({
        difficulty: 2,
        review_count: 2,
        interval_days: intervalFor(2, 2),
        due_date: rebasedDate(today, intervalFor(2, 2)),
      })
    })
  })

  it('difficulty-reusa-vetor: o vetor reavaliacao-com-nova-base dá 28d', () => {
    withDb((dbPath) => {
      const fixture = reevaluateFixture('reavaliacao-com-nova-base')
      const delta = rebaseDelta(fixture.params.today)
      seed(dbPath, {
        items: [
          makeItem({
            id: 'a',
            difficulty: toDifficulty(fixture.state.difficulty),
            review_count: fixture.state.review_count,
            interval_days: fixture.state.interval_days,
            due_date: rebasedDate(fixture.state.due_date, delta),
          }),
        ],
      })

      const result = runStudy([
        'difficulty',
        'a',
        String(fixture.params.new_difficulty),
        '--db',
        dbPath,
        '--json',
      ])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'difficulty')).toMatchObject({
        difficulty: fixture.expected.difficulty,
        review_count: fixture.expected.review_count,
        interval_days: fixture.expected.interval_days,
        due_date: rebasedDate(fixture.expected.due_date, delta),
      })
    })
  })

  it('difficulty-noop: valor igual ao atual confirma sucesso sem tocar no item', () => {
    withDb((dbPath) => {
      const before = makeItem({ id: 'a', difficulty: 4, review_count: 2, due_date: '2026-09-01' })
      seed(dbPath, { items: [before] })

      const result = runStudy(['difficulty', 'a', '4', '--db', dbPath, '--json'])
      const after = itemOf(runStudy(['show', 'a', '--db', dbPath, '--json']), 'show')

      expect(result.status).toBe(0)
      expect(after).toMatchObject({
        difficulty: before.difficulty,
        interval_days: before.interval_days,
        due_date: before.due_date,
        updated_at: before.updated_at,
      })
    })
  })

  it('difficulty-aceita-arquivado: item arquivado é reavaliado (ADR-019)', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', difficulty: 5, review_count: 2, interval_days: 8, status: 'archived' }),
        ],
      })

      const result = runStudy(['difficulty', 'a', '2', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'difficulty')).toMatchObject({
        status: 'archived',
        difficulty: 2,
        interval_days: intervalFor(2, 2),
      })
    })
  })

  it('difficulty-aceita-arquivo-morto: item do arquivo morto é reavaliado', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'a', difficulty: 5, review_count: 2, interval_days: 8, status: 'cold' })],
      })

      const result = runStudy(['difficulty', 'a', '2', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'difficulty')).toMatchObject({
        status: 'cold',
        difficulty: 2,
        interval_days: intervalFor(2, 2),
      })
    })
  })

  it('difficulty-invalido: 7 sai 2 e nada muda', () => {
    withDb((dbPath) => {
      const before = makeItem({ id: 'a', difficulty: 4, review_count: 2, due_date: '2026-09-01' })
      seed(dbPath, { items: [before] })

      const result = runStudy(['difficulty', 'a', '7', '--db', dbPath, '--json'])
      const after = itemOf(runStudy(['show', 'a', '--db', dbPath, '--json']), 'show')

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-difficulty',
        message: 'dificuldade inválida: use 1 a 5',
      })
      expect(after).toMatchObject({ difficulty: before.difficulty, due_date: before.due_date })
    })
  })

  it('difficulty-uso: posicional faltando ou flag a mais sai 1', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a' })] })

      const missing = runStudy(['difficulty', 'a', '--db', dbPath, '--json'])
      const extraFlag = runStudy(['difficulty', 'a', '2', '-s', 'x', '--db', dbPath, '--json'])
      const extraPositional = runStudy(['difficulty', 'a', '2', '3', '--db', dbPath, '--json'])

      for (const result of [missing, extraFlag, extraPositional]) {
        expect(result.status).toBe(1)
        expect(errorOf(result).code).toBe('usage')
      }
    })
  })
})

describe('AC10 — envelope --json (RNF-04, T-25)', () => {
  it('difficulty-json-envelope: schema_version 1 com difficulty.item', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', difficulty: 5, review_count: 2, interval_days: 8 })] })

      const result = runStudy(['difficulty', 'a', '2', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result)['difficulty']).toMatchObject({ item: { difficulty: 2 } })
    })
  })
})
