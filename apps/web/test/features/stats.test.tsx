import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { type Deps, type Item, type ReviewLog } from '@study/core'
import { StatsView } from '../../src/features/stats/view/StatsView.tsx'
import { type Store } from '../../src/store/index.ts'
import { strings } from '../../src/strings.ts'
import { makeItem, makeLog, openTestStore, renderApp, seed, storeWith, testDeps } from '../helpers.tsx'

const originalTimezone = process.env.TZ
process.env.TZ = 'America/Sao_Paulo'

afterAll(() => {
  process.env.TZ = originalTimezone
})

afterEach(cleanup)

async function openStats(store: Store, deps: Deps): Promise<void> {
  renderApp(store, deps, '#/stats')
  await screen.findByRole('heading', { name: strings.stats.heading })
}

async function seedLogs(store: Store, logs: readonly ReviewLog[]): Promise<void> {
  await store.transaction(async (scoped) => {
    for (const log of logs) await scoped.saveReviewLog(log)
  })
}

describe('AC-8 stats', () => {
  it('stats-mostra-streak-contagens-e-check-ins-do-dia', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Ativo 1', due_date: '2026-10-10' }),
      makeItem('a-2', { title: 'Ativo 2', due_date: '2026-10-11' }),
      makeItem('a-3', { title: 'Arquivado', status: 'archived', due_date: '2026-10-12' }),
      makeItem('a-4', { title: 'Morto', status: 'cold', due_date: '2026-10-13' }),
    ])
    await seedLogs(store, [makeLog('l-1', 'a-1', { reviewed_at: '2026-09-30T12:00:00Z' })])

    await openStats(store, testDeps())

    expect(screen.getByText(`${strings.stats.streak}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.stats.active}: 2`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.stats.archived}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.stats.cold}: 1`)).toBeInTheDocument()
    expect(screen.getByText(`${strings.stats.checkinsToday}: 1`)).toBeInTheDocument()
  })

  it('stats-conta-check-in-do-dia-por-data-local', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { due_date: '2026-10-10' }),
      makeItem('a-2', { due_date: '2026-10-11' }),
    ])
    await seedLogs(store, [
      makeLog('l-1', 'a-1', { reviewed_at: '2026-10-01T02:30:00Z' }),
      makeLog('l-2', 'a-2', { reviewed_at: '2026-09-29T15:00:00Z' }),
    ])

    await openStats(store, testDeps('2026-09-30'))

    expect(screen.getByText(`${strings.stats.checkinsToday}: 1`)).toBeInTheDocument()
  })

  it('stats-total-de-check-ins-por-materia', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { subject: 'Cálculo', due_date: '2026-10-10' }),
      makeItem('a-2', { subject: 'Física', due_date: '2026-10-11' }),
    ])
    await seedLogs(store, [
      makeLog('l-1', 'a-1', { reviewed_at: '2026-09-28T12:00:00Z' }),
      makeLog('l-2', 'a-1', { reviewed_at: '2026-09-29T12:00:00Z' }),
      makeLog('l-3', 'a-2', { reviewed_at: '2026-09-29T13:00:00Z' }),
    ])

    await openStats(store, testDeps())

    expect(screen.getByText('Cálculo: 2')).toBeInTheDocument()
    expect(screen.getByText('Física: 1')).toBeInTheDocument()
  })

  it('stats-streak-carimba-1-em-banco-vazio', async () => {
    const { store } = await openTestStore()

    await openStats(store, testDeps())

    expect(screen.getByText(`${strings.stats.streak}: 1`)).toBeInTheDocument()
  })

  it('stats-streak-zera-com-item-devido-e-avanca-no-dia-seguinte', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { due_date: '2026-09-30' })])
    const deps = testDeps('2026-09-30')

    await openStats(store, deps)
    expect(screen.getByText(`${strings.stats.streak}: 0`)).toBeInTheDocument()

    const checkedIn: Item = makeItem('a-1', { due_date: '2026-10-10', review_count: 1 })
    await store.saveItem(checkedIn)
    cleanup()

    deps.setToday('2026-10-01')
    await openStats(store, deps)

    expect(screen.getByText(`${strings.stats.streak}: 1`)).toBeInTheDocument()
  })
})

describe('AC-9 estados do stats', () => {
  it('screen-stats-mostra-carregando-enquanto-o-historico-chega', () => {
    render(<StatsView state={{ status: 'loading' }} />)

    expect(screen.getByRole('status')).toHaveTextContent(strings.notice.loading)
  })

  it('screen-erro-do-stats-vira-mensagem-pt-br', async () => {
    const { store } = await openTestStore()

    renderApp(
      storeWith(store, { listReviewLogs: () => Promise.reject(new Error('IndexedDB explodiu')) }),
      testDeps(),
      '#/stats',
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.store)
  })
})
