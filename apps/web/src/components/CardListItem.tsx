import { type CalendarDay, type Card, isOverdue } from '@study/core'
import { Paper, Typography } from 'bosi-design-system/react'
import { type JSX, useState } from 'react'
import { formatCalendarDay } from '../format'
import { DeleteIcon, EditIcon, ExpandIcon, ReviewIcon } from './icons'

const EMPTY_CONTENT_MESSAGE = 'Sem conteúdo.'

const ICON_BUTTON_CLASSES =
  'rounded-lg p-1.5 text-primary-on-light hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-on-dark'

export interface CardListItemProps {
  readonly card: Card
  readonly today: CalendarDay
  readonly onReview?: (card: Card) => void
  readonly onEdit?: (card: Card) => void
  readonly onDelete?: (card: Card) => void
  readonly pending?: boolean
}

export function CardListItem({
  card,
  today,
  onReview,
  onEdit,
  onDelete,
  pending,
}: CardListItemProps): JSX.Element {
  const overdue = isOverdue(card, today)
  const [expanded, setExpanded] = useState(false)
  const hasContent = card.content.trim().length > 0
  return (
    <li>
      <Paper
        className={`flex flex-col gap-2${overdue ? ' border-2 border-error' : ''}`}
      >
        <div className="flex items-center justify-between gap-4">
          <Typography
            as="p"
            size="body"
            className={overdue ? 'text-error' : ''}
          >
            {formatCalendarDay(card.nextReviewDate)}
          </Typography>
          <Typography as="p" size="body">
            {card.name}
          </Typography>
          <Typography as="p" size="body">
            {card.category}
          </Typography>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Marcar como revisado"
              onClick={() => onReview?.(card)}
              disabled={pending}
              className={ICON_BUTTON_CLASSES}
            >
              <ReviewIcon />
            </button>
            <button
              type="button"
              aria-label="Editar"
              onClick={() => onEdit?.(card)}
              className={ICON_BUTTON_CLASSES}
            >
              <EditIcon />
            </button>
            <button
              type="button"
              aria-label="Excluir"
              onClick={() => onDelete?.(card)}
              className={ICON_BUTTON_CLASSES}
            >
              <DeleteIcon />
            </button>
            <button
              type="button"
              aria-label={expanded ? 'Recolher' : 'Expandir'}
              aria-expanded={expanded}
              onClick={() => setExpanded((previous) => !previous)}
              className={ICON_BUTTON_CLASSES}
            >
              <span className={expanded ? 'inline-block rotate-180' : ''}>
                <ExpandIcon />
              </span>
            </button>
          </div>
        </div>
        {expanded &&
          (hasContent ? (
            <Typography as="p" size="body">
              {card.content}
            </Typography>
          ) : (
            <Typography as="p" size="body" color="secondary">
              {EMPTY_CONTENT_MESSAGE}
            </Typography>
          ))}
      </Paper>
    </li>
  )
}
