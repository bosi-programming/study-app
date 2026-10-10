import type { Card } from './card.ts';
import type { CalendarDay } from './data.ts';

export function isOverdue(card: Card, today: CalendarDay): boolean {
  return card.nextReviewDate < today;
}
