import { type CalendarDay, type Card, isOverdue } from '@study/core'
import { Button, Paper, Typography } from 'bosi-design-system/react'
import { type ComponentProps, type JSX, useState } from 'react'
import { formatCalendarDay } from '../format'
import { DeleteIcon, EditIcon, ExpandIcon, ReviewIcon } from './icons'

type CardActionButtonProps = ComponentProps<typeof Button> & {
  readonly disabled?: boolean | undefined
}

const CardActionButton = Button as (props: CardActionButtonProps) => JSX.Element

const EMPTY_CONTENT_MESSAGE = 'Sem conteúdo.'

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
    <li className={overdue ? 'border-error' : ''}>
      <Paper className="flex flex-col gap-2">
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
          <div className="flex items-center gap-2">
            <CardActionButton
              aria-label="Marcar como revisado"
              onClick={() => onReview?.(card)}
              disabled={pending}
            >
              <ReviewIcon />
            </CardActionButton>
            <Button aria-label="Editar" onClick={() => onEdit?.(card)}>
              <EditIcon />
            </Button>
            <Button aria-label="Excluir" onClick={() => onDelete?.(card)}>
              <DeleteIcon />
            </Button>
            <Button
              aria-label={expanded ? 'Recolher' : 'Expandir'}
              aria-expanded={expanded}
              onClick={() => setExpanded((previous) => !previous)}
            >
              <span className={expanded ? 'inline-block rotate-180' : ''}>
                <ExpandIcon />
              </span>
            </Button>
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
