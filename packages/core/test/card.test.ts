import { describe, expect, it } from 'vitest';
import { type Card, type NewCard, createCard } from '../src/card.ts';
import { type CalendarDay, addDays } from '../src/data.ts';
import { nextReviewDate } from '../src/review.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

const TODAY = day('2026-03-10');

const validInput = (): NewCard => ({
  name: 'Name',
  category: 'Category',
  content: 'Content',
});

describe('Card (AC1)', () => {
  it('has the 8 expected fields', () => {
    const card = createCard(validInput(), TODAY);

    expect(Object.keys(card).sort()).toEqual(
      [
        'id',
        'name',
        'category',
        'content',
        'lastReviewDate',
        'reviewCount',
        'nextReviewDate',
        'createdDate',
      ].sort(),
    );
  });

  it('types lastReviewDate as CalendarDay | null', () => {
    const withDate: Card = {
      id: 'id-1',
      name: 'Name',
      category: 'Category',
      content: 'Content',
      lastReviewDate: day('2026-03-01'),
      reviewCount: 1,
      nextReviewDate: day('2026-03-08'),
      createdDate: day('2026-03-01'),
    };
    const withoutDate: Card = {
      id: 'id-2',
      name: 'Name',
      category: 'Category',
      content: 'Content',
      lastReviewDate: null,
      reviewCount: 0,
      nextReviewDate: day('2026-03-08'),
      createdDate: day('2026-03-01'),
    };

    expect(withDate.lastReviewDate).toBe('2026-03-01');
    expect(withoutDate.lastReviewDate).toBeNull();
  });

  it('keeps fields readonly (type-level)', () => {
    const card = createCard(validInput(), TODAY);
    const tryReassign = (): void => {
      // @ts-expect-error readonly: Card fields cannot be reassigned
      card.name = 'Other';
    };

    expect(tryReassign).toBeTypeOf('function');
  });
});

describe('initial state (AC2)', () => {
  it('sets reviewCount to 0', () => {
    const card = createCard(validInput(), TODAY);

    expect(card.reviewCount).toBe(0);
  });

  it('sets lastReviewDate to null', () => {
    const card = createCard(validInput(), TODAY);

    expect(card.lastReviewDate).toBeNull();
  });
});

describe('dates on creation (AC3)', () => {
  it('sets createdDate to the injected today', () => {
    const card = createCard(validInput(), TODAY);

    expect(card.createdDate).toBe('2026-03-10');
  });

  it('sets nextReviewDate to today + 7', () => {
    const card = createCard(validInput(), TODAY);

    expect(card.nextReviewDate).toBe('2026-03-17');
  });
});

describe('id (AC6)', () => {
  it('is a non-empty string', () => {
    const card = createCard(validInput(), TODAY);

    expect(typeof card.id).toBe('string');
    expect(card.id.length).toBeGreaterThan(0);
  });

  it('is unique across creations', () => {
    const first = createCard(validInput(), TODAY);
    const second = createCard(validInput(), TODAY);

    expect(first.id).not.toBe(second.id);
  });
});

describe('immutability (AC7)', () => {
  it('does not mutate the input', () => {
    const input = validInput();
    const before: NewCard = {
      name: 'Name',
      category: 'Category',
      content: 'Content',
    };

    createCard(input, TODAY);

    expect(input).toEqual(before);
  });

  it('returns a new object', () => {
    const input = validInput();

    const card = createCard(input, TODAY);
    const other = createCard(input, TODAY);

    expect(card).not.toBe(input);
    expect(card).not.toBe(other);
  });
});

describe('single source of review rule (AC5)', () => {
  it('uses nextReviewDate(today, null, 0) as its source', () => {
    const card = createCard(validInput(), TODAY);

    expect(card.nextReviewDate).toBe(nextReviewDate(TODAY, null, 0));
    expect(card.nextReviewDate).toBe(addDays(TODAY, 7));
  });

  it('keeps a new card at today + 7', () => {
    const card = createCard(validInput(), day('2026-03-10'));

    expect(card.nextReviewDate).toBe('2026-03-17');
  });
});

describe('no validation (AC8)', () => {
  it('passes values through as received', () => {
    const input: NewCard = {
      name: '  Name  ',
      category: ' Cat ',
      content: '   ',
    };

    const card = createCard(input, TODAY);

    expect(card.name).toBe('  Name  ');
    expect(card.category).toBe(' Cat ');
    expect(card.content).toBe('   ');
  });
});
