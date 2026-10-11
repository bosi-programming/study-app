import {
  type Card,
  createCard,
  distinctCategories,
  markCardReviewed,
  type NewCard,
  todayLocal,
} from '@study/core'
import { Button, Typography } from 'bosi-design-system/react'
import { type JSX, useEffect, useState } from 'react'
import {
  type CardFilters,
  INITIAL_FILTERS,
  isFilterActive,
  visibleCards,
} from '../cards'
import { getCardStore } from '../persistence'
import { CardListItem } from './CardListItem'
import { ConfirmationDialog } from './ConfirmationDialog'
import { EmptyState } from './EmptyState'
import { FilterBar } from './FilterBar'
import { LogoMark } from './icons'
import { NewCardForm } from './NewCardForm'

type LoadStatus = 'loading' | 'ready' | 'error'

type FormState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly card: Card }

type DeleteState = {
  readonly card: Card
  readonly pending: boolean
  readonly error: string | null
}

const DELETE_ERROR_MESSAGE = 'Não foi possível excluir. Tente novamente.'

const REVIEW_ERROR_MESSAGE = 'Não foi possível marcar como revisado. Tente novamente.'

export function CardListScreen(): JSX.Element {
  const [cards, setCards] = useState<readonly Card[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [filters, setFilters] = useState<CardFilters>(INITIAL_FILTERS)
  const [formState, setFormState] = useState<FormState | null>(null)
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
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

  function openDelete(card: Card): void {
    setDeleteState({ card, pending: false, error: null })
  }

  function cancelDelete(): void {
    if (deleteState?.pending) {
      return
    }
    setDeleteState(null)
  }

  async function confirmDelete(): Promise<void> {
    if (deleteState === null || deleteState.pending) {
      return
    }
    const target = deleteState.card
    setDeleteState({ card: target, pending: true, error: null })
    try {
      const store = await getCardStore()
      await store.remove(target.id)
      setCards((previous) => previous.filter((card) => card.id !== target.id))
      setDeleteState(null)
    } catch {
      setDeleteState({ card: target, pending: false, error: DELETE_ERROR_MESSAGE })
    }
  }

  async function handleReview(card: Card): Promise<void> {
    if (reviewingId !== null) {
      return
    }
    setReviewingId(card.id)
    setReviewError(null)
    const updated = markCardReviewed(card, today)
    try {
      const store = await getCardStore()
      await store.update(updated)
      setCards((previous) =>
        previous.map((current) => (current.id === updated.id ? updated : current)),
      )
      setReviewingId(null)
    } catch {
      setReviewingId(null)
      setReviewError(REVIEW_ERROR_MESSAGE)
    }
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
            onReview={handleReview}
            onEdit={openEdit}
            onDelete={openDelete}
            pending={reviewingId === card.id}
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
          <div className="flex items-center gap-2">
            <LogoMark />
            <Typography as="h1" size="h1">
              Estudo
            </Typography>
          </div>
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
        {reviewError !== null ? <p role="alert">{reviewError}</p> : null}
        {renderContent()}
      </div>
      <ConfirmationDialog
        open={deleteState !== null}
        cardName={deleteState?.card.name ?? ''}
        pending={deleteState?.pending ?? false}
        error={deleteState?.error ?? null}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}
