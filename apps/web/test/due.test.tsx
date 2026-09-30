import '@testing-library/jest-dom/vitest'
import { type InitialDueFixture, goldenFixtures } from '@study/golden'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DueDate, initialDueEstimate, useDue } from '../src/features/due/index.ts'

afterEach(cleanup)

function initialDueFixture(): InitialDueFixture {
  const fixture = goldenFixtures.find((entry) => entry.kind === 'initial-due')
  if (fixture === undefined || fixture.kind !== 'initial-due') {
    throw new Error('fixture vencimento-inicial-por-dificuldade ausente')
  }
  return fixture
}

const fixture = initialDueFixture()

function DueHarness({ difficulty, createdOn }: { difficulty: number; createdOn: string }) {
  const estimate = useDue(difficulty, createdOn)
  return <DueDate estimate={estimate} />
}

describe('S-39 web-golden-vector', () => {
  it.each(fixture.cases)(
    'computa a dificuldade $difficulty pelo model',
    ({ difficulty, expected_due_date, expected_interval_days }) => {
      expect(initialDueEstimate(difficulty, fixture.created_on)).toEqual({
        dueDate: expected_due_date,
        intervalDays: expected_interval_days,
      })
    },
  )

  it.each(fixture.cases)(
    'renderiza o vencimento da dificuldade $difficulty pela view',
    ({ difficulty, expected_due_date, expected_interval_days }) => {
      render(<DueHarness difficulty={difficulty} createdOn={fixture.created_on} />)

      expect(screen.getByText(expected_due_date)).toBeInTheDocument()
      expect(screen.getByText(`${expected_interval_days} dias`)).toBeInTheDocument()
    },
  )

  it.each([0, 6])('recusa a dificuldade %i fora do domínio', (difficulty) => {
    expect(() => initialDueEstimate(difficulty, fixture.created_on)).toThrow()
  })
})
