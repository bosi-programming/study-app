import { type QueueOrderFixture, goldenFixtures } from '@study/golden'
import { describe, expect, it } from 'vitest'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import {
  errorOf,
  jsonOf,
  queueOf,
  rebaseDelta,
  rebasedDate,
  runStudy,
  seed,
  todayLocalDate,
} from './helpers.ts'

type QueueJsonItem = {
  readonly id: string
  readonly subject: string
  readonly days_late: number
}

const fixturesByCase = new Map(goldenFixtures.map((fixture) => [fixture.case, fixture]))

function queueFixture(name: string): QueueOrderFixture {
  const fixture = fixturesByCase.get(name)
  if (fixture === undefined || fixture.kind !== 'queue-order') {
    throw new Error(`fixture ausente: ${name}`)
  }
  return fixture
}

function overdueOf(result: Parameters<typeof queueOf>[0]): QueueJsonItem[] {
  return queueOf(result)['overdue'] as QueueJsonItem[]
}

function todayOf(result: Parameters<typeof queueOf>[0]): QueueJsonItem[] {
  return queueOf(result)['today'] as QueueJsonItem[]
}

function bySubjectOf(result: Parameters<typeof queueOf>[0]): Record<string, number> {
  return queueOf(result)['by_subject'] as Record<string, number>
}

const QUEUE_FIXTURE = 'fila-atrasados-primeiro'

describe('AC1 — due mostra a fila do dia (RF-05, CA-12, T-11)', () => {
  it('due-atrasados-primeiro: o vetor T-11 rebaseado mantém ordem, split e o futuro fora', () => {
    withDb((dbPath) => {
      const fixture = queueFixture(QUEUE_FIXTURE)
      const delta = rebaseDelta(fixture.today)
      seed(dbPath, {
        items: fixture.items.map((item) =>
          makeItem({
            id: item.id,
            title: item.title,
            subject: 'Cálculo',
            due_date: rebasedDate(item.due_date, delta),
          }),
        ),
      })

      const result = runStudy(['due', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect([...overdueOf(result), ...todayOf(result)].map((item) => item.id)).toEqual(
        fixture.expected_order,
      )
    })
  })

  it('due-limite-hoje: vencimento exatamente hoje conta como hoje, days_late 0', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: todayLocalDate() })] })

      const result = runStudy(['due', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(overdueOf(result)).toEqual([])
      expect(todayOf(result)).toEqual([{ id: 'a', subject: 'Cálculo', days_late: 0 }])
    })
  })

  it('due-days-late: cada atrasado traz o days_late do vetor', () => {
    withDb((dbPath) => {
      const fixture = queueFixture(QUEUE_FIXTURE)
      const delta = rebaseDelta(fixture.today)
      seed(dbPath, {
        items: fixture.items.map((item) =>
          makeItem({ id: item.id, title: item.title, due_date: rebasedDate(item.due_date, delta) }),
        ),
      })

      const result = runStudy(['due', '--db', dbPath, '--json'])

      expect(overdueOf(result).map((item) => item.days_late)).toEqual([6, 2, 1])
    })
  })

  it('due-humano: cabeçalho, seções, numeração contínua e as duas formas de vencimento', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      const overdueDate = rebasedDate(today, -6)
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Atrasado', due_date: overdueDate }),
          makeItem({ id: 'b', title: 'De hoje', due_date: today }),
        ],
      })

      const human = runStudy(['due', '--db', dbPath]).stdout

      expect(human).toContain(`Fila de hoje — ${today}`)
      expect(human).toContain('Atrasados (1)')
      expect(human).toContain('Hoje (1)')
      expect(human).toContain('  1. ')
      expect(human).toContain('  2. ')
      expect(human).toContain(`venceu ${overdueDate} (6d)`)
      expect(human).toContain('vence hoje')
      expect(human).toContain('d4  n=0')
    })
  })

  it('due-fila-vazia: cabeçalho e totais zerados, sem seção e sem resumo', () => {
    withDb((dbPath) => {
      const human = runStudy(['due', '--db', dbPath]).stdout
      const json = runStudy(['due', '--db', dbPath, '--json'])

      expect(human).toContain(`Fila de hoje — ${todayLocalDate()}`)
      expect(human).toContain('0 atrasados, 0 para hoje.')
      expect(human).not.toContain('Atrasados (')
      expect(human).not.toContain('Por matéria:')
      expect(json.status).toBe(0)
      expect(overdueOf(json)).toEqual([])
      expect(todayOf(json)).toEqual([])
      expect(bySubjectOf(json)).toEqual({})
    })
  })
})

describe('AC2 — resumo por matéria e totais (RF-07, T-15)', () => {
  it('due-resumo: o humano lista as contagens e o JSON traz by_subject', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', subject: 'A', due_date: rebasedDate(today, -1) }),
          makeItem({ id: 'b', subject: 'A', due_date: today }),
          makeItem({ id: 'c', subject: 'B', due_date: today }),
        ],
      })

      const human = runStudy(['due', '--db', dbPath]).stdout
      const json = runStudy(['due', '--db', dbPath, '--json'])

      expect(human).toContain('Por matéria: A 2, B 1')
      expect(bySubjectOf(json)).toEqual({ A: 2, B: 1 })
    })
  })

  it('due-totais: a linha de totais fecha a saída humana', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', due_date: rebasedDate(today, -2) }),
          makeItem({ id: 'b', due_date: rebasedDate(today, -1) }),
          makeItem({ id: 'c', due_date: today }),
        ],
      })

      const lines = runStudy(['due', '--db', dbPath]).stdout.trimEnd().split('\n')

      expect(lines.at(-1)).toBe('2 atrasados, 1 para hoje.')
    })
  })

  it('due-resumo-ordem: a matéria segue a primeira aparição na fila, não a ordem alfabética', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', subject: 'Zebra', due_date: rebasedDate(today, -1) }),
          makeItem({ id: 'b', subject: 'Aardvark', due_date: today }),
        ],
      })

      const human = runStudy(['due', '--db', dbPath]).stdout

      expect(human).toContain('Por matéria: Zebra 1, Aardvark 1')
    })
  })
})

describe('AC3 — -s normaliza e recorta (RF-07, RN-12)', () => {
  function seedTwoSubjects(dbPath: string): void {
    const today = todayLocalDate()
    seed(dbPath, {
      items: [
        makeItem({ id: 'a', title: 'Derivadas', subject: 'Cálculo', due_date: rebasedDate(today, -1) }),
        makeItem({ id: 'b', title: 'Phrasal verbs', subject: 'Inglês', due_date: rebasedDate(today, -1) }),
      ],
    })
  }

  it('due-filtro-materia: -s calculo restringe fila e resumo', () => {
    withDb((dbPath) => {
      seedTwoSubjects(dbPath)

      const result = runStudy(['due', '-s', 'calculo', '--db', dbPath, '--json'])
      const human = runStudy(['due', '-s', 'calculo', '--db', dbPath]).stdout

      expect(result.status).toBe(0)
      expect(overdueOf(result).map((item) => item.id)).toEqual(['a'])
      expect(bySubjectOf(result)).toEqual({ Cálculo: 1 })
      expect(human).toContain('Por matéria: Cálculo 1')
      expect(human).not.toContain('Inglês')
    })
  })

  it('due-filtro-sem-caixa-nem-acento: -s CALCULO acha o mesmo item', () => {
    withDb((dbPath) => {
      seedTwoSubjects(dbPath)

      const result = runStudy(['due', '-s', 'CALCULO', '--db', dbPath, '--json'])

      expect(overdueOf(result).map((item) => item.id)).toEqual(['a'])
    })
  })

  it('due-filtro-vazio: matéria sem item na fila devolve fila e resumo vazios', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, { items: [makeItem({ id: 'a', subject: 'Cálculo', due_date: today })] })

      const result = runStudy(['due', '-s', 'fisica', '--db', dbPath, '--json'])
      const human = runStudy(['due', '-s', 'fisica', '--db', dbPath]).stdout

      expect(result.status).toBe(0)
      expect(overdueOf(result)).toEqual([])
      expect(todayOf(result)).toEqual([])
      expect(bySubjectOf(result)).toEqual({})
      expect(human).toContain('0 atrasados, 0 para hoje.')
      expect(human).not.toContain('Por matéria:')
    })
  })

  it('due-filtro-nao-vaza: o item de outra matéria fica fora da fila e do resumo', () => {
    withDb((dbPath) => {
      seedTwoSubjects(dbPath)

      const result = runStudy(['due', '-s', 'ingles', '--db', dbPath, '--json'])

      expect(overdueOf(result).map((item) => item.id)).toEqual(['b'])
      expect(bySubjectOf(result)).toEqual({ Inglês: 1 })
    })
  })
})

describe('apoio — dispatch e não-ativo', () => {
  it('due-sem-status-flag: --status em due é flag desconhecida', () => {
    withDb((dbPath) => {
      const result = runStudy(['due', '--status', 'active', '--db', dbPath, '--json'])

      expect(result.status).toBe(1)
      expect(errorOf(result).code).toBe('usage')
    })
  })

  it('due-ignora-nao-ativo: arquivado e arquivo morto, vencidos, nunca entram na fila', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', due_date: today }),
          makeItem({ id: 'b', due_date: rebasedDate(today, -3), status: 'archived' }),
          makeItem({ id: 'c', due_date: rebasedDate(today, -3), status: 'cold' }),
        ],
      })

      const result = runStudy(['due', '--db', dbPath, '--json'])

      expect([...overdueOf(result), ...todayOf(result)].map((item) => item.id)).toEqual(['a'])
    })
  })
})

describe('AC10 — envelope --json (RNF-04, T-25)', () => {
  it('due-json-envelope: schema_version 1 com due.date, overdue, today e by_subject', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, { items: [makeItem({ id: 'a', subject: 'Cálculo', due_date: today })] })

      const result = runStudy(['due', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result)).toEqual({
        schema_version: 1,
        due: {
          date: today,
          overdue: [],
          today: [{ id: 'a', subject: 'Cálculo', days_late: 0 }],
          by_subject: { Cálculo: 1 },
        },
      })
    })
  })
})
