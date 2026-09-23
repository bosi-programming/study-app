import { type CheckinFixture, goldenFixtures } from '@study/golden'
import { toDifficulty } from '@study/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ALL_FLAGS, parseArgs } from '../../src/args.ts'
import { reviewCommand } from '../../src/commands/review.ts'
import { type CommandResult } from '../../src/commands/types.ts'
import { type CommandContext } from '../../src/context.ts'
import { systemDeps } from '../../src/deps.ts'
import { CliError, exitCodeFor } from '../../src/errors.ts'
import { type ItemJson } from '../../src/output/json.ts'
import { openStore, type Store } from '../../src/persistence/index.ts'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import {
  errorOf,
  historyOf,
  itemOf,
  jsonOf,
  rebaseDelta,
  rebasedDate,
  runStudy,
  seed,
  todayLocalDate,
} from './helpers.ts'

const promptMock = vi.hoisted(() => ({
  promptDifficulty: vi.fn(),
  withPromptAbort: vi.fn((run: () => unknown) => run()),
}))

vi.mock('../../src/prompt.ts', () => ({
  promptDifficulty: promptMock.promptDifficulty,
  withPromptAbort: promptMock.withPromptAbort,
}))

const fixturesByCase = new Map(goldenFixtures.map((fixture) => [fixture.case, fixture]))

function checkinFixture(name: string): CheckinFixture {
  const fixture = fixturesByCase.get(name)
  if (fixture === undefined || fixture.kind !== 'checkin') throw new Error(`fixture ausente: ${name}`)
  return fixture
}

type InProcessOutcome = {
  readonly result?: CommandResult
  readonly error?: unknown
}

function runReviewInProcess(dbPath: string, argv: readonly string[]): InProcessOutcome {
  const store: Store = openStore(dbPath)
  const ctx: CommandContext = {
    dbPath,
    dbExisted: true,
    deps: systemDeps,
    store,
    interactive: true,
    json: true,
    exportDir: null,
    close: () => store.close(),
  }
  try {
    return { result: reviewCommand(parseArgs(argv, ALL_FLAGS), ctx) }
  } catch (error) {
    return { error }
  } finally {
    ctx.close()
  }
}

beforeEach(() => {
  promptMock.promptDifficulty.mockReset()
})

function withFreshStore<T>(dbPath: string, run: (store: Store) => T): T {
  const store = openStore(dbPath)
  try {
    return run(store)
  } finally {
    store.close()
  }
}

describe('AC4 — check-in e log na mesma transação (RF-08, RF-13, ADR-011)', () => {
  it('review-registra-checkin: o vetor T-20 rebaseado, dois check-ins no mesmo dia', () => {
    withDb((dbPath) => {
      const fixture = checkinFixture('checkin-antecipado-e-dois-no-mesmo-dia')
      const [first, second] = fixture.checkins
      if (first === undefined || second === undefined) throw new Error('vetor T-20 incompleto')

      const delta = rebaseDelta(first.today)
      seed(dbPath, {
        items: [
          makeItem({
            id: 'a',
            difficulty: toDifficulty(fixture.state.difficulty),
            review_count: fixture.state.review_count,
            interval_days: fixture.state.interval_days,
            due_date: rebasedDate(fixture.state.due_date, delta),
            on_time_streak: fixture.state.on_time_streak,
          }),
        ],
      })

      const firstRun = runStudy(['review', 'a', '-d', String(first.expected.difficulty), '--db', dbPath, '--json'])
      const secondRun = runStudy(['review', 'a', '-d', String(second.expected.difficulty), '--db', dbPath, '--json'])

      expect(firstRun.status).toBe(0)
      const afterFirst = itemOf(firstRun, 'review')
      expect(afterFirst).toMatchObject({
        review_count: first.expected.review_count,
        interval_days: first.expected.interval_days,
        on_time_streak: first.expected.on_time_streak,
      })
      expect(afterFirst.due_date).toBe(rebasedDate(first.expected.due_date, delta))

      const afterSecond = itemOf(secondRun, 'review')
      expect(afterSecond).toMatchObject({
        review_count: second.expected.review_count,
        interval_days: second.expected.interval_days,
        on_time_streak: second.expected.on_time_streak,
      })
      expect(afterSecond.due_date).toBe(rebasedDate(second.expected.due_date, delta))
    })
  })

  it('review-marca-atraso: item vencido zera o streak e conta o vencimento novo de hoje', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [makeItem({ id: 'a', difficulty: 4, due_date: rebasedDate(today, -2) })],
      })

      const result = runStudy(['review', 'a', '-d', '4', '--db', dbPath, '--json'])
      const logs = historyOf(runStudy(['show', 'a', '--history', '--db', dbPath, '--json']))

      expect(result.status).toBe(0)
      expect(itemOf(result, 'review')).toMatchObject({ on_time_streak: 0, review_count: 1 })
      expect(logs[0]).toMatchObject({ late: true })
    })
  })

  it('review-log-na-mesma-transacao: o log guarda o vencimento anterior e o n novo', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: today })] })

      const result = runStudy(['review', 'a', '-d', '4', '--db', dbPath, '--json'])
      const logs = historyOf(runStudy(['show', 'a', '--history', '--db', dbPath, '--json']))

      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        due_date_at_review: today,
        review_count_after: 1,
        late: false,
      })
      expect(itemOf(result, 'review')).toMatchObject({ due_date: rebasedDate(today, 6) })
    })
  })
})

describe('AC5 — a dificuldade depois do check-in (RF-12, CA-13, CA-14)', () => {
  it('review-enter-mantem: o prompt devolvendo a atual deixa o check-in intacto', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, { items: [makeItem({ id: 'a', difficulty: 4, due_date: today })] })
      promptMock.promptDifficulty.mockReturnValue(4)

      const outcome = runReviewInProcess(dbPath, ['a'])

      expect(outcome.error).toBeUndefined()
      expect(outcome.result?.json).toMatchObject({
        item: { difficulty: 4, review_count: 1, interval_days: 6 },
      })
      expect(promptMock.promptDifficulty).toHaveBeenCalledWith(4)
    })
  })

  it('review-recalcula-com-n-base: d5 n=2 com -d 2 dá n=3 e 56d', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', difficulty: 5, review_count: 2, interval_days: 8, due_date: today }),
        ],
      })

      const result = runStudy(['review', 'a', '-d', '2', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemOf(result, 'review')).toMatchObject({
        difficulty: 2,
        review_count: 3,
        interval_days: 56,
        due_date: rebasedDate(today, 56),
      })
    })
  })

  it('review-d-igual-ao-enter: -d igual à atual tem o mesmo resultado do Enter', () => {
    const today = todayLocalDate()
    const seedItem = (): ReturnType<typeof makeItem> =>
      makeItem({ id: 'a', difficulty: 5, review_count: 2, interval_days: 8, due_date: today })

    let flagged: ItemJson | undefined
    withDb((dbPath) => {
      seed(dbPath, { items: [seedItem()] })
      const result = runStudy(['review', 'a', '-d', '5', '--db', dbPath, '--json'])
      expect(result.status).toBe(0)
      flagged = itemOf(result, 'review')
    })

    let entered: ItemJson | undefined
    withDb((dbPath) => {
      seed(dbPath, { items: [seedItem()] })
      promptMock.promptDifficulty.mockReturnValue(5)
      const outcome = runReviewInProcess(dbPath, ['a'])
      expect(outcome.error).toBeUndefined()
      entered = outcome.result?.json['item'] as ItemJson | undefined
    })

    if (flagged === undefined || entered === undefined) throw new Error('resultado ausente')
    expect(comparableFields(entered)).toEqual(comparableFields(flagged))
  })

  it('review-d-pula-prompt: com -d e sem TTY o stderr não traz o rótulo do prompt', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: todayLocalDate() })] })

      const result = runStudy(['review', 'a', '-d', '4', '--db', dbPath])

      expect(result.status).toBe(0)
      expect(result.stderr).not.toContain('Dificuldade')
    })
  })
})

function comparableFields(item: ItemJson): Record<string, unknown> {
  return {
    difficulty: item.difficulty,
    review_count: item.review_count,
    interval_days: item.interval_days,
    due_date: item.due_date,
    on_time_streak: item.on_time_streak,
  }
}

describe('AC7 — ordem, aborto e não-terminal (ADR-011, CLI.md)', () => {
  it('review-checkin-antes-do-prompt: o check-in já está commitado quando o prompt falha', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', difficulty: 4, due_date: todayLocalDate() })] })
      promptMock.promptDifficulty.mockImplementation(() => {
        throw CliError.aborted()
      })

      const outcome = runReviewInProcess(dbPath, ['a'])

      expect(outcome.error).toBeInstanceOf(CliError)
      const persisted = withFreshStore(dbPath, (store) => ({
        item: store.getItem('a'),
        logs: store.listReviewLogs('a'),
      }))
      expect(persisted.item).toMatchObject({ review_count: 1, difficulty: 4, interval_days: 6 })
      expect(persisted.logs).toHaveLength(1)
    })
  })

  it('review-aborto-130: o erro do prompt é aborted e o exitCodeFor devolve 130', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: todayLocalDate() })] })
      promptMock.promptDifficulty.mockImplementation(() => {
        throw CliError.aborted()
      })

      const outcome = runReviewInProcess(dbPath, ['a'])

      expect(outcome.error).toBeInstanceOf(CliError)
      expect((outcome.error as CliError).code).toBe('aborted')
      expect(exitCodeFor(outcome.error)).toBe(130)
    })
  })

  it('review-sem-terminal-sem-d: sai 1 com a mensagem e não registra nada', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: todayLocalDate() })] })

      const result = runStudy(['review', 'a', '--db', dbPath, '--json'])
      const item = itemOf(runStudy(['show', 'a', '--db', dbPath, '--json']), 'show')

      expect(result.status).toBe(1)
      expect(errorOf(result)).toEqual({
        code: 'usage',
        message: '-d é obrigatório sem terminal interativo',
      })
      expect(item.review_count).toBe(0)
      expect(historyOf(runStudy(['show', 'a', '--history', '--db', dbPath, '--json']))).toEqual([])
    })
  })

  it('review-no-input-e-json-sem-d: --no-input e --json desligam o prompt pelo mesmo caminho', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: todayLocalDate() })] })

      for (const flag of ['--no-input', '--json']) {
        const result = runStudy(['review', 'a', flag, '--db', dbPath])

        expect(result.status, flag).toBe(1)
        expect(result.stderr, flag).toContain('-d é obrigatório sem terminal interativo')
      }
    })
  })
})

describe('AC8 — -d inválido e item não ativo (RF-12, RF-09, CA-08)', () => {
  it('review-d-invalido: -d 7 sai 2 antes de qualquer escrita', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: todayLocalDate() })] })

      const result = runStudy(['review', 'a', '-d', '7', '--db', dbPath, '--json'])
      const item = itemOf(runStudy(['show', 'a', '--db', dbPath, '--json']), 'show')

      expect(result.status).toBe(2)
      expect(errorOf(result)).toEqual({
        code: 'invalid-difficulty',
        message: 'dificuldade inválida: use 1 a 5',
      })
      expect(item.review_count).toBe(0)
      expect(historyOf(runStudy(['show', 'a', '--history', '--db', dbPath, '--json']))).toEqual([])
    })
  })

  it('review-recusa-arquivado: exit 3 com a mensagem do core', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'archived' })] })

      const result = runStudy(['review', 'a', '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({
        code: 'item-not-active',
        message: 'item arquivado; use study unarchive <ref>',
      })
    })
  })

  it('review-recusa-arquivo-morto: exit 3 com a mensagem do core', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', status: 'cold' })] })

      const result = runStudy(['review', 'a', '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({
        code: 'item-not-active',
        message: 'item no arquivo morto; use study cold restore <ref>',
      })
    })
  })

  it('review-ref-nao-encontrada: exit 3 com item não encontrado', () => {
    withDb((dbPath) => {
      const result = runStudy(['review', 'zzzz', '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(3)
      expect(errorOf(result)).toEqual({ code: 'not-found', message: 'item não encontrado: zzzz' })
    })
  })
})

describe('AC10 — envelope --json (RNF-04, T-25)', () => {
  it('review-json-envelope: schema_version 1 com review.item atualizado e stdout limpo', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: todayLocalDate() })] })

      const result = runStudy(['review', 'a', '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result)).toEqual({
        schema_version: 1,
        review: { item: itemOf(result, 'review') },
      })
      expect(jsonOf(result)['review']).toMatchObject({ item: { review_count: 1, difficulty: 4 } })
      expect(result.stdout).not.toContain('Check-in')
      expect(result.stdout).not.toContain('Dificuldade')
    })
  })
})
