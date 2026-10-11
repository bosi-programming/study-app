import { Button, Paper, Typography } from 'bosi-design-system/react'
import {
  type Card,
  addDays,
  createCard,
  todayLocal,
} from '@study/core'
import { type ReactElement, createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { visibleCards } from '../src/cards.ts'
import { formatCalendarDay } from '../src/format.ts'

const CARD_COUNT = 500
const BUDGET_MS = 100
const NO_FILTERS = { start: '', end: '', category: '' } as const

const base = todayLocal()

const cards: readonly Card[] = Array.from(
  { length: CARD_COUNT },
  (_value, index) =>
    createCard(
      {
        name: `Cartão ${index}`,
        category: index % 2 === 0 ? 'Matemática' : 'História',
        content: 'Conteúdo',
      },
      addDays(base, index),
    ),
)

function buildRow(card: Card): ReactElement {
  return createElement(Paper, {
    key: card.id,
    className: 'flex items-center justify-between',
    children: [
      createElement(Typography, {
        key: 'date',
        as: 'p',
        size: 'body',
        children: formatCalendarDay(card.nextReviewDate),
      }),
      createElement(Typography, {
        key: 'name',
        as: 'p',
        size: 'body',
        children: card.name,
      }),
      createElement(Typography, {
        key: 'category',
        as: 'p',
        size: 'body',
        children: card.category,
      }),
      createElement(Button, {
        key: 'review',
        'aria-label': 'Revisar',
        children: createElement('span'),
      }),
    ],
  })
}

const tree = createElement('ul', null, cards.map(buildRow))

const start = performance.now()
const visible = visibleCards(cards, NO_FILTERS)
const html = renderToString(tree)
const elapsed = performance.now() - start

if (visible.length !== CARD_COUNT || html.length === 0) {
  throw new Error('benchmark produced an unexpected result')
}

if (elapsed >= BUDGET_MS) {
  throw new Error(
    `bench exceeded budget: ${elapsed.toFixed(2)}ms >= ${String(BUDGET_MS)}ms`,
  )
}

console.log(`bench:web ${CARD_COUNT} cards in ${elapsed.toFixed(2)}ms`)
