import { describe, expect, it } from 'vitest'
import {
  type CheckinFixture,
  type GoldenFixture,
  type QueueOrderFixture,
  goldenFixtures,
} from '@study/golden'
import {
  MAX_INTERVAL_DAYS,
  type Item,
  advanceQueueStreak,
  compareDates,
  createItem,
  initialDueDate,
  intervalFor,
  isDue,
  isLate,
  recordReview,
  reevaluateDifficulty,
  subjectKey,
  toDifficulty,
} from '@study/core'
import { fixedClock, makeItem, seqIds } from './helpers.ts'

const AT_NOON = 'T12:00:00.000Z'

const CHECKIN_CASES = [
  { caseId: 'C-59', caseName: 'checkin-atrasado-nao-penaliza' },
  { caseId: 'C-61', caseName: 'contador-de-prazo-zera-no-atraso' },
  { caseId: 'C-64', caseName: 'checkin-antecipado-e-dois-no-mesmo-dia' },
] as const

const fixturesByCase = new Map(goldenFixtures.map((fixture) => [fixture.case, fixture]))

function requireFixture<TKind extends GoldenFixture['kind']>(
  name: string,
  kind: TKind,
): Extract<GoldenFixture, { kind: TKind }> {
  const fixture = fixturesByCase.get(name)
  if (!fixture) throw new Error(`fixture ausente: ${name}`)
  if (fixture.kind !== kind) throw new Error(`fixture ${name} é ${fixture.kind}, esperado ${kind}`)
  return fixture as Extract<GoldenFixture, { kind: TKind }>
}

function depsAt(today: string) {
  return { clock: fixedClock(`${today}${AT_NOON}`, today), ids: seqIds() }
}

function itemFromState(state: CheckinFixture['state']): Item {
  return makeItem({
    difficulty: toDifficulty(state.difficulty),
    review_count: state.review_count,
    interval_days: state.interval_days,
    due_date: state.due_date,
    on_time_streak: state.on_time_streak,
  })
}

function expectCheckinsToMatchFixture(fixture: CheckinFixture): void {
  let item = itemFromState(fixture.state)
  const results: { readonly item: Item; readonly late: boolean }[] = []

  for (const step of fixture.checkins) {
    const reviewed = recordReview(item, depsAt(step.today))
    item = reviewed.item
    results.push({ item, late: reviewed.log.late })
  }

  expect(results).toHaveLength(fixture.checkins.length)

  fixture.checkins.forEach((step, index) => {
    const result = results[index]
    expect(result, `check-in ${index} de ${fixture.case}`).toBeDefined()
    if (!result) return

    const { late, ...expectedItem } = step.expected
    expect(result.late).toBe(late)
    expect(result.item).toMatchObject(expectedItem)
  })
}

function queueOrder(fixture: QueueOrderFixture): string[] {
  const items = fixture.items.map((entry) =>
    makeItem({ id: entry.id, title: entry.title, due_date: entry.due_date }),
  )

  return items
    .filter((item) => isDue(item, fixture.today))
    .toSorted((left, right) => {
      const lateFirst =
        Number(isLate(right, fixture.today)) - Number(isLate(left, fixture.today))
      if (lateFirst !== 0) return lateFirst

      const byDueDate = compareDates(left.due_date, right.due_date)
      if (byDueDate !== 0) return byDueDate

      return left.id.localeCompare(right.id)
    })
    .map((item) => item.id)
}

describe('C-58 T-01 vencimento inicial por dificuldade', () => {
  const fixture = requireFixture('vencimento-inicial-por-dificuldade', 'initial-due')

  it.each([...fixture.cases])('d$difficulty vence em $expected_due_date', (testCase) => {
    const difficulty = toDifficulty(testCase.difficulty)
    const item = createItem({ ...fixture.new_item, difficulty }, depsAt(fixture.created_on))

    expect(item.difficulty).toBe(difficulty)
    expect(item.review_count).toBe(0)
    expect(item.interval_days).toBe(testCase.expected_interval_days)
    expect(item.due_date).toBe(testCase.expected_due_date)
    expect(initialDueDate(difficulty, fixture.created_on)).toBe(testCase.expected_due_date)
  })
})

describe('C-16 T-02 progressão até o teto de 365 dias', () => {
  const fixture = requireFixture('progressao-ate-teto', 'progression')

  it('reproduz expected_intervals a partir dos parâmetros do fixture', () => {
    const difficulty = toDifficulty(fixture.difficulty)
    const progression = Array.from({ length: fixture.checkins }, (_, n) => intervalFor(difficulty, n))

    expect(fixture.base_interval_days).toBe(intervalFor(difficulty, 0))
    expect(fixture.cap_days).toBe(MAX_INTERVAL_DAYS)
    expect(progression).toEqual([...fixture.expected_intervals])
    expect(fixture.expected_intervals.at(-1)).toBe(MAX_INTERVAL_DAYS)
  })
})

describe.each(CHECKIN_CASES)('$caseId check-ins lidos do fixture', ({ caseId, caseName }) => {
  const fixture = requireFixture(caseName, 'checkin')

  it(`${caseId} ${caseName} (${fixture.requirement}) reproduz cada expectativa`, () => {
    expectCheckinsToMatchFixture(fixture)
  })
})

describe('C-60 T-04 reavaliação recalcula com a nova base', () => {
  const fixture = requireFixture('reavaliacao-com-nova-base', 'reevaluate')

  it('reaplica o mesmo n com a nova dificuldade e não muta o item', () => {
    const item = makeItem({
      difficulty: toDifficulty(fixture.state.difficulty),
      review_count: fixture.state.review_count,
      interval_days: fixture.state.interval_days,
      due_date: fixture.state.due_date,
    })

    const next = reevaluateDifficulty(item, fixture.params.new_difficulty, depsAt(fixture.params.today))

    expect(next).toMatchObject(fixture.expected)
    expect(item.difficulty).toBe(fixture.state.difficulty)
    expect(item.interval_days).toBe(fixture.state.interval_days)
  })
})

describe('C-62 T-11 ordem da fila: atrasados primeiro', () => {
  const fixture = requireFixture('fila-atrasados-primeiro', 'queue-order')

  it('põe os atrasados na frente, por vencimento, e deixa o futuro fora', () => {
    const order = queueOrder(fixture)

    expect(order).toEqual([...fixture.expected_order])
    expect(order).not.toContain('0a1f3c50-3333-4000-8000-000000000003')
  })
})

describe('C-63 T-12 normalização de matéria', () => {
  const fixture = requireFixture('normalizacao-de-materia', 'normalize')

  it.each([...fixture.pairs])('"$input" vira "$expected_key"', (pair) => {
    expect(subjectKey({ subject: pair.input })).toBe(pair.expected_key)
  })
})

describe('C-65 T-21 streak de fila zerada', () => {
  const fixture = requireFixture('streak-de-fila-zerada', 'queue-streak')

  it('acumula, repete no mesmo dia, zera no buraco e zera com fila cheia', () => {
    let state = fixture.initial

    fixture.days.forEach((day, index) => {
      const next = advanceQueueStreak(state, day.queue_empty, day.day)
      expect(next, `dia ${index} (${day.day})`).toEqual(day.expected)
      state = next
    })
  })
})
