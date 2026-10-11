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

const INITIAL_FILTERS: CardFilters = { start: '', end: '', category: '' }

export function CardListScreen(): JSX.Element {
  const [cards, setCards] = useState<readonly Card[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [filters, setFilters] = useState<CardFilters>(INITIAL_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
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

  async function handleCreate(input: NewCard): Promise<void> {
    const card = createCard(input, today)
    const store = await getCardStore()
    await store.create(card)
    setCards((previousCards) => [...previousCards, card])
    setFormOpen(false)
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
          <CardListItem key={card.id} card={card} today={today} />
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
          <Button onClick={() => setFormOpen(true)}>Novo conteúdo</Button>
        </div>
        {formOpen ? (
          <NewCardForm
            categories={categories}
            onCreate={handleCreate}
            onCancel={() => setFormOpen(false)}
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
