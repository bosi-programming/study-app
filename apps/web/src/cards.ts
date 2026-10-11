import {
  type CalendarDay,
  type Card,
  type DateRange,
  filterByCategory,
  filterByDateRange,
  sortCards,
} from '@study/core'

export interface CardFilters {
  readonly start: string
  readonly end: string
  readonly category: string
}

export function isFilterActive(filters: CardFilters): boolean {
  return (
    filters.start !== '' || filters.end !== '' || filters.category !== ''
  )
}

export function visibleCards(
  cards: readonly Card[],
  filters: CardFilters,
): readonly Card[] {
  let visible = cards
  if (filters.start !== '' || filters.end !== '') {
    let range: DateRange = {}
    if (filters.start !== '') {
      range = { ...range, start: filters.start as CalendarDay }
    }
    if (filters.end !== '') {
      range = { ...range, end: filters.end as CalendarDay }
    }
    visible = filterByDateRange(visible, range)
  }
  if (filters.category !== '') {
    visible = filterByCategory(visible, filters.category)
  }
  return sortCards(visible)
}
