import { describe, expect, it } from 'vitest';
import {
  type CalendarDay,
  type Card,
  type CardField,
  type CardFieldError,
  type CardRule,
  type CardValidation,
  type NewCard,
  CARD_LIMITS,
  addDays,
  createCard,
  nextReviewDate,
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

describe('validation barrel (AC5)', () => {
  it('exports validateCard, CARD_LIMITS and types from the barrel', () => {
    expect(validateCard).toBeTypeOf('function');
    expect(CARD_LIMITS).toBeTypeOf('object');

    const input: NewCard = {
      name: 'Name',
      category: 'Category',
      content: 'Content',
    };
    const result: CardValidation = validateCard(input);
    const field: CardField = 'name';
    const rule: CardRule = 'required';
    const error: CardFieldError = { field, rule };

    expect(result.valid).toBe(true);
    expect(error.rule).toBe('required');
  });

  it('exposes the RB-10 limits', () => {
    expect(CARD_LIMITS).toEqual({ name: 40, category: 40, content: 5000 });
  });
});
