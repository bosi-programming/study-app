import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { QueueView } from '../../src/features/queue/view/QueueView.tsx'
import { type Store } from '../../src/store/index.ts'
import { strings } from '../../src/strings.ts'
import { makeItem, openTestStore, renderApp, seed, testDeps } from '../helpers.tsx'

afterEach(cleanup)

function failingDueItems(store: Store): Store {
  return { ...store, dueItems: () => Promise.reject(new Error('IndexedDB explodiu')) }
}

describe('AC-4 fila do dia', () => {
  it('queue-atrasados-primeiro-em-ordem-de-vencimento', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Vence hoje', due_date: '2026-09-30' }),
      makeItem('a-2', { title: 'Atrasado 6 dias', due_date: '2026-09-24' }),
      makeItem('a-3', { title: 'Atrasado 2 dias', due_date: '2026-09-28' }),
      makeItem('a-4', { title: 'Ainda nao venceu', due_date: '2026-10-05' }),
    ])

    renderApp(store, testDeps(), '#/')

    const queue = await screen.findByRole('region', { name: strings.queue.heading })
    const links = within(queue)
      .getAllByRole('link')
      .map((link) => link.textContent)

    expect(links).toEqual(['Atrasado 6 dias', 'Atrasado 2 dias', 'Vence hoje'])
  })

  it('queue-mostra-atraso-em-dias-e-proximo-vencimento', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Atrasado', due_date: '2026-09-24' }),
      makeItem('a-2', { title: 'De hoje', due_date: '2026-09-30' }),
    ])

    renderApp(store, testDeps(), '#/')

    const queue = await screen.findByRole('region', { name: strings.queue.heading })
    expect(within(queue).getByText(strings.queue.late(6))).toBeInTheDocument()
    expect(within(queue).getByText(strings.queue.dueToday)).toBeInTheDocument()
    expect(within(queue).getByText('2026-09-24')).toBeInTheDocument()
  })

  it('queue-resumo-traz-hoje-atrasados-e-recorte-por-materia', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { subject: 'Cálculo', due_date: '2026-09-24' }),
      makeItem('a-2', { subject: 'Cálculo', due_date: '2026-09-30' }),
      makeItem('a-3', { subject: 'Física', due_date: '2026-09-30' }),
      makeItem('a-4', { subject: 'Física', due_date: '2026-10-10' }),
    ])

    renderApp(store, testDeps(), '#/')

    const queue = await screen.findByRole('region', { name: strings.queue.heading })
    expect(within(queue).getByText(`${strings.queue.summaryTotal}: 3`)).toBeInTheDocument()
    expect(within(queue).getByText(`${strings.queue.summaryLate}: 1`)).toBeInTheDocument()
    expect(within(queue).getByText('Cálculo: 2')).toBeInTheDocument()
    expect(within(queue).getByText('Física: 1')).toBeInTheDocument()
  })

  it('queue-vazio-quando-nada-esta-devido', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { due_date: '2026-10-10' })])

    renderApp(store, testDeps(), '#/')

    expect(await screen.findByText(strings.queue.empty)).toBeInTheDocument()
  })
})

describe('AC-9 estados da fila', () => {
  it('screen-fila-vazia-mostra-a-acao-principal', async () => {
    const { store } = await openTestStore()
    renderApp(store, testDeps(), '#/')

    const action = await screen.findByRole('link', { name: strings.queue.emptyAction })

    expect(action).toHaveAttribute('href', '#/add')
  })

  it('screen-fila-mostra-carregando-enquanto-o-store-responde', () => {
    render(<QueueView state={{ status: 'loading' }} />)

    expect(screen.getByRole('status')).toHaveTextContent(strings.notice.loading)
  })

  it('screen-erro-de-store-vira-mensagem-pt-br', async () => {
    const { store } = await openTestStore()
    renderApp(failingDueItems(store), testDeps(), '#/')

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.store)
  })

  it('screen-erro-nao-mostra-stack-nem-kind', async () => {
    const { store } = await openTestStore()
    renderApp(failingDueItems(store), testDeps(), '#/')

    const alert = await screen.findByRole('alert')

    expect(alert.textContent).toBe(strings.errors.store)
  })
})
