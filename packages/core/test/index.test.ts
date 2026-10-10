import { describe, expect, it } from 'vitest';
import {
  type CalendarDay,
  type Card,
  type NewCard,
  addDays,
  createCard,
  nextReviewDate,
  todayLocal,
} from '../src/index.ts';

describe('public barrel (AC9)', () => {
  it('exports runtime symbols', () => {
    expect(todayLocal).toBeTypeOf('function');
    expect(addDays).toBeTypeOf('function');
    expect(createCard).toBeTypeOf('function');
  });

  it('exports nextReviewDate', () => {
    expect(nextReviewDate).toBeTypeOf('function');
  });

  it('exports types (typecheck)', () => {
    const day: CalendarDay = todayLocal();
    const input: NewCard = {
      name: 'Name',
      category: 'Category',
      content: 'Content',
    };
    const card: Card = createCard(input, day);

    expect(card.createdDate).toBe(day);
  });
});
