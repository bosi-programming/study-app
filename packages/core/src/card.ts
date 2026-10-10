import type { CalendarDay } from './data.ts';
import { todayLocal } from './data.ts';
import { nextReviewDate } from './review.ts';

export interface Card {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly content: string;
  readonly lastReviewDate: CalendarDay | null;
  readonly reviewCount: number;
  readonly nextReviewDate: CalendarDay;
  readonly createdDate: CalendarDay;
}

export interface NewCard {
  name: string;
  category: string;
  content: string;
}

export function createCard(
  input: NewCard,
  today: CalendarDay = todayLocal(),
): Card {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    category: input.category,
    content: input.content,
    lastReviewDate: null,
    reviewCount: 0,
    nextReviewDate: nextReviewDate(today, null, 0),
    createdDate: today,
  };
}
