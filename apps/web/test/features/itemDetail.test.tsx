import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type Deps } from '@study/core'
import { type ItemDetailController } from '../../src/features/items/model/itemDetail.ts'
import { ItemDetailView } from '../../src/features/items/view/ItemDetailView.tsx'
import { type Store } from '../../src/store/index.ts'
import { strings } from '../../src/strings.ts'
import { makeItem, openTestStore, renderApp, seed, storeWith, testDeps } from '../helpers.tsx'

afterEach(cleanup)

async function openDetail(store: Store, deps: Deps, id: string): Promise<void> {
  renderApp(store, deps, `#/items/${id}`)
  await screen.findByRole('heading', { name: strings.detail.heading })
}

describe('AC-7 ciclo de vida e detalhe', () => {
  it('detail-mostra-leitura-completa-com-on_time_streak', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Análise real', subject: 'Cálculo', on_time_streak: 7 }),
    ])

    await openDetail(store, testDeps(), 'a-1')

    expect(screen.getByText('Análise real')).toBeInTheDocument()
    expect(screen.getByText('Cálculo')).toBeInTheDocument()
    expect(screen.getByText('médio')).toBeInTheDocument()
    expect(screen.getByText('2026-09-30')).toBeInTheDocument()
    expect(screen.getByText(strings.status.active)).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getAllByText(strings.detail.none)).toHaveLength(2)
  })

  it('detail-arquiva-e-tira-da-fila-e-das-contagens', async () => {
    const { store } = await openTestStore()
    const deps = testDeps()
    await seed(store, [makeItem('a-1', { title: 'Análise real', due_date: '2026-09-30' })])

    await openDetail(store, deps, 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.detail.archive }))

    expect(await screen.findByText(strings.status.archived)).toBeInTheDocument()
    const stored = await store.getItem('a-1')
    expect(stored?.status).toBe('archived')
    expect(stored?.archived_at).not.toBeNull()
    expect(await store.dueItems(deps.clock.todayLocalDate())).toEqual([])
    expect(await store.countItems('active')).toBe(0)
  })

  it('detail-desarquiva-e-devolve-a-fila', async () => {
    const { store } = await openTestStore()
    const deps = testDeps()
    await seed(store, [
      makeItem('a-1', {
        title: 'Análise real',
        due_date: '2026-09-30',
        status: 'archived',
        archived_at: '2026-09-01T10:00:00Z',
      }),
    ])

    await openDetail(store, deps, 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.detail.unarchive }))

    expect(await screen.findByText(strings.status.active)).toBeInTheDocument()
    const stored = await store.getItem('a-1')
    expect(stored?.status).toBe('active')
    expect(stored?.archived_at).toBeNull()
    expect((await store.dueItems(deps.clock.todayLocalDate())).map((item) => item.id)).toEqual(['a-1'])
  })

  it('detail-recusa-arquivar-item-ja-arquivado', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { status: 'archived', archived_at: '2026-09-01T10:00:00Z' })])

    await openDetail(store, testDeps(), 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.detail.archive }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.alreadyArchived)
    expect((await store.getItem('a-1'))?.status).toBe('archived')
  })

  it('detail-recusa-desarquivar-item-no-arquivo-morto', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', {
        status: 'cold',
        cold_archived_at: '2026-09-01T10:00:00Z',
      }),
    ])

    await openDetail(store, testDeps(), 'a-1')
    fireEvent.click(screen.getByRole('button', { name: strings.detail.unarchive }))

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.itemCold)
    expect((await store.getItem('a-1'))?.status).toBe('cold')
  })
})

describe('AC-9 estados do detalhe', () => {
  it('screen-detalhe-mostra-carregando-enquanto-o-item-chega', () => {
    const controller: ItemDetailController = {
      state: { status: 'loading' },
      error: null,
      archive: () => undefined,
      unarchive: () => undefined,
    }

    render(<ItemDetailView controller={controller} />)

    expect(screen.getByRole('status')).toHaveTextContent(strings.notice.loading)
  })

  it('screen-detalhe-de-item-inexistente-vira-nao-encontrado', async () => {
    const { store } = await openTestStore()

    renderApp(store, testDeps(), '#/items/sem-item')

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.notFound)
  })

  it('screen-erro-do-detalhe-vira-mensagem-pt-br', async () => {
    const { store } = await openTestStore()

    renderApp(
      storeWith(store, { getItem: () => Promise.reject(new Error('IndexedDB explodiu')) }),
      testDeps(),
      '#/items/a-1',
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.store)
  })
})
