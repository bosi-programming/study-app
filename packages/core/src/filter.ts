import type { Card } from './card.ts';
import type { CalendarDay } from './data.ts';
import { categoryKey } from './category.ts';

export interface DateRange {
  readonly start?: CalendarDay;
  readonly end?: CalendarDay;
}

export function filterByDateRange(
  cards: readonly Card[],
  range: DateRange,
): readonly Card[] {
  return cards.filter((card) => {
    if (range.start !== undefined && card.nextReviewDate < range.start) {
      return false;
    }
    if (range.end !== undefined && card.nextReviewDate > range.end) {
      return false;
    }
    return true;
  });
}

export function filterByCategory(
  cards: readonly Card[],
  category: string,
): readonly Card[] {
  const key = categoryKey(category);
  return cards.filter((card) => categoryKey(card.category) === key);
}
