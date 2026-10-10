import { describe, expect, it } from 'vitest';
import {
  type CalendarDay,
  type Card,
  type CardField,
  type CardFieldError,
  type CardRule,
  type CardValidation,
  type DateRange,
  type NewCard,
  CARD_LIMITS,
  addDays,
  categoryKey,
  createCard,
  distinctCategories,
  filterByCategory,
  filterByDateRange,
  isOverdue,
  nextReviewDate,
  sortCards,
  todayLocal,
  validateCard,
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

describe('category barrel (CORE-05)', () => {
  it('exports categoryKey and distinctCategories from the barrel', () => {
    expect(categoryKey).toBeTypeOf('function');
    expect(distinctCategories).toBeTypeOf('function');
    expect(categoryKey('Inglês')).toBe('inglês');
  });
});

describe('order barrel (CORE-06)', () => {
  it('exports sortCards from the barrel', () => {
    expect(sortCards).toBeTypeOf('function');
  });
});

describe('filter barrel (CORE-07)', () => {
  it('exports filterByDateRange & filterByCategory from the barrel', () => {
    expect(filterByDateRange).toBeTypeOf('function');
    expect(filterByCategory).toBeTypeOf('function');
  });

  it('DateRange type is usable (typecheck)', () => {
    const range: DateRange = {
      start: '2026-10-10' as CalendarDay,
      end: '2026-10-20' as CalendarDay,
    };

    expect(range.start).toBe('2026-10-10');
  });
});

describe('overdue barrel (CORE-08)', () => {
  it('exports isOverdue from the barrel', () => {
    expect(isOverdue).toBeTypeOf('function');
  });
});

describe('validation barrel (AC5)', () => {
  it('exports validateCard, CARD_LIMITS and types from the barrel', () => {
    expect(validateCard).toBeTypeOf('function');
    expect(CARD_LIMITS).toBeTypeOf('object');

    const input: NewCard = {
      name: '',
      category: 'Category',
      content: 'Content',
    };
    const result: CardValidation = validateCard(input);
    const [error] = result.errors;
    const field: CardField | undefined = error?.field;
    const rule: CardRule | undefined = error?.rule;
    const shaped: CardFieldError | undefined = error;

    expect(result.valid).toBe(false);
    expect(field).toBe('name');
    expect(rule).toBe('required');
    expect(shaped).toEqual({ field: 'name', rule: 'required' });
  });

  it('exposes the RB-10 limits', () => {
    expect(CARD_LIMITS).toEqual({ name: 40, category: 40, content: 5000 });
  });
});
