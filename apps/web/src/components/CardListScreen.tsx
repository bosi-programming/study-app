import { type Card, createCard, distinctCategories, type NewCard, todayLocal } from '@study/core'
import { Button, Typography } from 'bosi-design-system/react'
import { type JSX, useEffect, useState } from 'react'
import { type CardFilters, isFilterActive, visibleCards } from '../cards'
import { getCardStore } from '../persistence'
import { CardListItem } from './CardListItem'
import { EmptyState } from './EmptyState'
import { FilterBar } from './FilterBar'
import { NewCardForm } from './NewCardForm'

type LoadStatus = 'loading' | 'ready' | 'error'

type FormState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly card: Card }

const INITIAL_FILTERS: CardFilters = { start: '', end: '', category: '' }

export function CardListScreen(): JSX.Element {
  const [cards, setCards] = useState<readonly Card[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [filters, setFilters] = useState<CardFilters>(INITIAL_FILTERS)
  const [formState, setFormState] = useState<FormState | null>(null)
  const today = todayLocal()

  useEffect(() => {
    let active = true
    getCardStore()
      .then((store) => store.list())
      .then((loaded) => {
        if (!active) {
          return
        }
        setCards(loaded)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) {
          return
        }
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  const visible = visibleCards(cards, filters)
  const categories = distinctCategories(cards)

  function openCreate(): void {
    setFormState({ mode: 'create' })
  }

  function openEdit(card: Card): void {
    setFormState({ mode: 'edit', card })
  }

  function close(): void {
    setFormState(null)
  }

  async function handleSave(input: NewCard): Promise<void> {
    const store = await getCardStore()
    if (formState?.mode === 'edit') {
      const updated: Card = { ...formState.card, ...input }
      await store.update(updated)
      setCards((previousCards) =>
        previousCards.map((card) => (card.id === updated.id ? updated : card)),
      )
    } else {
      const card = createCard(input, today)
      await store.create(card)
      setCards((previousCards) => [...previousCards, card])
    }
    setFormState(null)
  }

  function renderContent(): JSX.Element {
    if (status === 'loading') {
      return (
        <Typography as="p" size="body">
          Carregando...
        </Typography>
      )
    }
    if (status === 'error') {
      return (
        <Typography as="p" size="body">
          Não foi possível carregar os cartões.
        </Typography>
      )
    }
    if (cards.length === 0) {
      return <EmptyState message="Você ainda não tem cartões." />
    }
    if (visible.length === 0 && isFilterActive(filters)) {
      return <EmptyState message="Nenhum cartão para esses filtros." />
    }
    return (
      <ul data-testid="card-list" className="flex flex-col gap-2 pb-5">
        {visible.map((card) => (
          <CardListItem
            key={card.id}
            card={card}
            today={today}
            onEdit={openEdit}
          />
        ))}
      </ul>
    )
  }

  return (
    <div
      data-testid="card-list-screen"
      className="mx-auto w-full max-w-[1024px] px-10"
    >
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <Typography as="h1" size="h1">
            Estudo
          </Typography>
          <Button onClick={openCreate}>Novo conteúdo</Button>
        </div>
        {formState ? (
          <NewCardForm
            key={formState.mode === 'edit' ? formState.card.id : 'new'}
            categories={categories}
            {...(formState.mode === 'edit' ? { initialValues: formState.card } : {})}
            onCreate={handleSave}
            onCancel={close}
          />
        ) : null}
        <FilterBar
          filters={filters}
          categories={categories}
          onChange={setFilters}
        />
        {renderContent()}
      </div>
    </div>
  )
}
