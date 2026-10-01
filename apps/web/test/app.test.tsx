import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { strings } from '../src/strings.ts'
import { makeItem, openTestStore, renderApp, seed, testDeps } from './helpers.tsx'

afterEach(cleanup)

describe('S-43 web-root-composition', () => {
  it('app-monta-a-fila-por-padrao', async () => {
    const { store } = await openTestStore()
    renderApp(store, testDeps(), '#/')

    expect(await screen.findByRole('heading', { name: strings.app.title })).toBeInTheDocument()
    expect(await screen.findByText(strings.queue.empty)).toBeInTheDocument()
  })

  it('app-navega-por-hash-e-cai-na-fila-em-hash-desconhecido', async () => {
    const { store } = await openTestStore()
    renderApp(store, testDeps(), '#/desconhecido')

    expect(await screen.findByText(strings.queue.empty)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: strings.app.navAdd }))

    expect(await screen.findByRole('heading', { name: strings.add.heading })).toBeInTheDocument()
  })

  it('app-nav-alcanca-as-seis-rotas', async () => {
    const { store } = await openTestStore()
    await seed(store, [makeItem('a-1', { title: 'Derivadas parciais', due_date: '2026-09-30' })])
    renderApp(store, testDeps(), '#/items')

    expect(screen.getByRole('link', { name: strings.app.navQueue })).toHaveAttribute('href', '#/')
    expect(screen.getByRole('link', { name: strings.app.navAdd })).toHaveAttribute('href', '#/add')
    expect(screen.getByRole('link', { name: strings.app.navItems })).toHaveAttribute('href', '#/items')
    expect(screen.getByRole('link', { name: strings.app.navStats })).toHaveAttribute('href', '#/stats')

    fireEvent.click(await screen.findByRole('link', { name: 'Derivadas parciais' }))

    expect(await screen.findByRole('heading', { name: strings.detail.heading })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: strings.detail.review })).toHaveAttribute(
      'href',
      '#/review/a-1',
    )
  })
})
