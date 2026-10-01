import '@testing-library/jest-dom/vitest'
import { type InitialDueFixture, goldenFixtures } from '@study/golden'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { strings } from '../../src/strings.ts'
import { openTestStore, renderApp, testDeps } from '../helpers.tsx'

afterEach(cleanup)

function initialDueFixture(): InitialDueFixture {
  const fixture = goldenFixtures.find((entry) => entry.kind === 'initial-due')
  if (fixture === undefined || fixture.kind !== 'initial-due') {
    throw new Error('fixture de vencimento inicial ausente')
  }
  return fixture
}

async function openAdd(store: Parameters<typeof renderApp>[0], deps: Parameters<typeof renderApp>[1]): Promise<void> {
  renderApp(store, deps, '#/add')
  await screen.findByRole('heading', { name: strings.add.heading })
}

function fill(values: { readonly title?: string; readonly subject?: string; readonly difficulty?: string }) {
  if (values.title !== undefined) {
    fireEvent.change(screen.getByLabelText(strings.add.titleLabel), { target: { value: values.title } })
  }
  if (values.subject !== undefined) {
    fireEvent.change(screen.getByLabelText(strings.add.subjectLabel), {
      target: { value: values.subject },
    })
  }
  if (values.difficulty !== undefined) {
    fireEvent.change(screen.getByLabelText(strings.add.difficultyLabel), {
      target: { value: values.difficulty },
    })
  }
}

function submit(): void {
  fireEvent.click(screen.getByRole('button', { name: strings.add.submit }))
}

describe('AC-2 adicionar item', () => {
  it('add-cria-item-e-volta-para-a-lista', async () => {
    const { store } = await openTestStore()
    await openAdd(store, testDeps())

    fill({ title: 'Derivadas parciais', subject: 'Cálculo', difficulty: '3' })
    submit()

    expect(await screen.findByRole('heading', { name: strings.items.heading })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Derivadas parciais' })).toBeInTheDocument()

    const items = await store.listItems()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      title: 'Derivadas parciais',
      subject: 'Cálculo',
      difficulty: 3,
      due_date: '2026-10-05',
      review_count: 0,
      status: 'active',
    })
  })

  it('add-mostra-o-vencimento-inicial-do-vetor-golden', async () => {
    const fixture = initialDueFixture()
    const { store } = await openTestStore()
    await openAdd(store, testDeps(fixture.created_on))

    for (const entry of fixture.cases) {
      fill({ difficulty: String(entry.difficulty) })

      expect(await screen.findByText(entry.expected_due_date)).toBeInTheDocument()
    }
  })

  it('add-recusa-titulo-so-com-espacos-com-mensagem-por-campo', async () => {
    const { store } = await openTestStore()
    await openAdd(store, testDeps())

    fill({ title: '   ', subject: 'Cálculo' })
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('título é obrigatório')
    expect(await store.listItems()).toEqual([])
  })

  it('add-recusa-dificuldade-fora-de-1-a-5', async () => {
    const { store } = await openTestStore()
    await openAdd(store, testDeps())

    fill({ title: 'Derivadas parciais', subject: 'Cálculo', difficulty: '6' })
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('dificuldade inválida: use 1 a 5')
    expect(await store.listItems()).toEqual([])
  })

  it('add-recusa-materia-acima-de-60-caracteres', async () => {
    const { store } = await openTestStore()
    await openAdd(store, testDeps())

    fill({ title: 'Derivadas parciais', subject: 'M'.repeat(61) })
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent('matéria deve ter no máximo 60 caracteres')
    expect(await store.listItems()).toEqual([])
  })
})
