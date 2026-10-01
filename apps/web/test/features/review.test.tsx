import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type Deps } from '@study/core'
import { type Store } from '../../src/store/index.ts'
import { strings } from '../../src/strings.ts'
import { makeItem, openTestStore, renderApp, seed, testDeps } from '../helpers.tsx'

afterEach(cleanup)

async function openReview(store: Store, deps: Deps, id: string): Promise<void> {
  renderApp(store, deps, `#/review/${id}`)
  await screen.findByRole('heading', { name: strings.review.heading })
}

async function checkin(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: strings.review.checkin }))
  await screen.findByText(strings.review.reevaluate)
}

function failingLogStore(store: Store): Store {
  return {
    ...store,
    transaction: (run) =>
      store.transaction((scoped) =>
        run({ ...scoped, saveReviewLog: () => Promise.reject(new Error('falha no log')) }),
      ),
  }
}

describe('AC-5 check-in e reavaliação', () => {
  it('review-registra-check-in-e-recalcula-o-vencimento', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { difficulty: 3, due_date: '2026-09-30', interval_days: 5 })])

    await openReview(store, testDeps(), 'a-1')
    await checkin()

    const stored = await store.getItem('a-1')
    expect(stored).toMatchObject({
      review_count: 1,
      interval_days: 10,
      due_date: '2026-10-10',
      on_time_streak: 1,
      last_reviewed_at: '2026-09-30T12:00:00Z',
    })

    expect(await store.listReviewLogs('a-1')).toEqual([
      {
        id: '00000000-0000-4000-8000-000000000001',
        item_id: 'a-1',
        reviewed_at: '2026-09-30T12:00:00Z',
        due_date_at_review: '2026-09-30',
        interval_after: 10,
        review_count_after: 1,
        late: false,
      },
    ])
  })

  it('review-pede-a-dificuldade-com-a-atual-como-padrao', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { difficulty: 4, due_date: '2026-09-30' })])

    await openReview(store, testDeps(), 'a-1')
    await checkin()

    const input = screen.getByLabelText(strings.review.difficultyLabel) as HTMLInputElement
    expect(input.value).toBe('4')
  })

  it('review-manter-nao-escreve-nada', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { difficulty: 3, due_date: '2026-09-30', interval_days: 5 })])

    await openReview(store, testDeps(), 'a-1')
    await checkin()

    const afterCheckin = await store.getItem('a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.review.keep }))

    expect(await store.getItem('a-1')).toEqual(afterCheckin)
    expect(await store.listReviewLogs('a-1')).toHaveLength(1)
  })

  it('review-mudar-a-dificuldade-recalcula-com-a-base-nova', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { difficulty: 3, due_date: '2026-09-30', interval_days: 5 })])

    await openReview(store, testDeps(), 'a-1')
    await checkin()

    fireEvent.change(screen.getByLabelText(strings.review.difficultyLabel), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: strings.review.apply }))

    expect(await store.getItem('a-1')).toMatchObject({
      difficulty: 2,
      review_count: 1,
      interval_days: 14,
      due_date: '2026-10-14',
    })
  })

  it('review-dois-check-ins-no-mesmo-dia-dobram-o-intervalo', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { difficulty: 3, due_date: '2026-09-30', interval_days: 5 })])

    await openReview(store, testDeps(), 'a-1')
    await checkin()
    fireEvent.click(screen.getByRole('button', { name: strings.review.keep }))
    await checkin()

    expect(await store.getItem('a-1')).toMatchObject({
      review_count: 2,
      interval_days: 20,
      due_date: '2026-10-20',
    })
  })

  it('review-check-in-adiantado-conta-como-no-prazo', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { difficulty: 3, due_date: '2026-12-01', interval_days: 5 })])

    await openReview(store, testDeps(), 'a-1')
    await checkin()

    expect(await store.getItem('a-1')).toMatchObject({
      on_time_streak: 1,
      review_count: 1,
      interval_days: 10,
      due_date: '2026-10-10',
    })
    expect((await store.listReviewLogs('a-1'))[0]?.late).toBe(false)
  })

  it('review-grava-item-e-log-na-mesma-transacao', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { difficulty: 3, due_date: '2026-09-30', interval_days: 5 })])
    const before = await store.getItem('a-1')

    await openReview(failingLogStore(store), testDeps(), 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.review.checkin }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.store)
    expect(await store.getItem('a-1')).toEqual(before)
    expect(await store.listReviewLogs('a-1')).toEqual([])
  })
})

describe('AC-6 recusa de check-in', () => {
  it('review-recusa-item-arquivado-com-o-caminho-de-desarquivar', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { status: 'archived', archived_at: '2026-09-01T10:00:00Z' })])

    await openReview(store, testDeps(), 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.review.checkin }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.itemArchived)
    expect(screen.getByRole('link', { name: strings.review.openItem })).toHaveAttribute('href', '#/items/a-1')
  })

  it('review-recusa-item-no-arquivo-morto-com-o-caminho-de-restaurar', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { status: 'cold', cold_archived_at: '2026-09-01T10:00:00Z' })])

    await openReview(store, testDeps(), 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.review.checkin }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.itemCold)
    expect(screen.getByRole('link', { name: strings.review.openItem })).toHaveAttribute('href', '#/items/a-1')
  })

  it('review-nao-grava-nada-quando-recusa', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { status: 'archived', archived_at: '2026-09-01T10:00:00Z' })])
    const before = await store.getItem('a-1')

    await openReview(store, testDeps(), 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.review.checkin }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(await store.getItem('a-1')).toEqual(before)
    expect(await store.listReviewLogs('a-1')).toEqual([])
  })
})
