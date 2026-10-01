import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type Deps } from '@study/core'
import { type Store } from '../../src/store/index.ts'
import { strings } from '../../src/strings.ts'
import { makeItem, openTestStore, renderApp, seed, testDeps } from '../helpers.tsx'

afterEach(cleanup)

async function openItems(store: Store, deps: Deps): Promise<HTMLElement> {
  renderApp(store, deps, '#/items')
  return screen.findByRole('heading', { name: strings.items.heading })
}

function rows(): string[] {
  const section = screen.getByRole('region', { name: strings.items.heading })
  return within(section)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

describe('AC-3 lista e busca', () => {
  it('items-mostra-so-ativos-sem-filtro', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Ativo', due_date: '2026-10-01' }),
      makeItem('a-2', { title: 'Arquivado', status: 'archived', due_date: '2026-10-02' }),
      makeItem('a-3', { title: 'Morto', status: 'cold', due_date: '2026-10-03' }),
    ])

    await openItems(store, testDeps())

    expect(rows()).toEqual(['Ativo'])
  })

  it('items-filtra-por-materia-e-por-status', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Cálculo ativo', subject: 'Cálculo', due_date: '2026-10-01' }),
      makeItem('a-2', { title: 'Física ativa', subject: 'Física', due_date: '2026-10-02' }),
      makeItem('a-3', {
        title: 'Cálculo arquivado',
        subject: 'Cálculo',
        status: 'archived',
        due_date: '2026-10-03',
      }),
    ])

    await openItems(store, testDeps())
    fireEvent.change(screen.getByLabelText(strings.items.statusLabel), { target: { value: 'archived' } })

    await waitFor(() => expect(rows()).toEqual(['Cálculo arquivado']))

    fireEvent.change(screen.getByLabelText(strings.items.statusLabel), { target: { value: 'active' } })
    fireEvent.change(screen.getByLabelText(strings.items.subjectLabel), { target: { value: 'Física' } })

    await waitFor(() => expect(rows()).toEqual(['Física ativa']))
  })

  it('items-ordena-por-vencimento', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Tarde', due_date: '2026-10-20' }),
      makeItem('a-2', { title: 'Cedo', due_date: '2026-10-01' }),
      makeItem('a-3', { title: 'Meio', due_date: '2026-10-10' }),
    ])

    await openItems(store, testDeps())

    expect(rows()).toEqual(['Cedo', 'Meio', 'Tarde'])
  })

  it('items-busca-por-termo-sem-caixa-e-sem-acento', async () => {
    const { store } = await openTestStore()
    await seed(store, [
      makeItem('a-1', { title: 'Análise real', due_date: '2026-10-01' }),
      makeItem('a-2', { title: 'Derivadas parciais', due_date: '2026-10-02' }),
    ])

    await openItems(store, testDeps())
    fireEvent.change(screen.getByLabelText(strings.items.searchLabel), { target: { value: 'analise' } })

    await waitFor(() => expect(rows()).toEqual(['Análise real']))

    fireEvent.change(screen.getByLabelText(strings.items.searchLabel), { target: { value: 'ANALISE' } })

    await waitFor(() => expect(rows()).toEqual(['Análise real']))
  })

  it('items-vazio-quando-nada-casa', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { title: 'Análise real', due_date: '2026-10-01' })])

    await openItems(store, testDeps())
    fireEvent.change(screen.getByLabelText(strings.items.searchLabel), { target: { value: 'zzz' } })

    expect(await screen.findByText(strings.items.empty)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: strings.items.emptyAction })).toHaveAttribute('href', '#/add')
  })
})
