import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Card, type NewCard, createCard, markCardReviewed } from '../src/card.ts';
import { type CalendarDay, addDays, todayLocal } from '../src/data.ts';
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

const reviewedCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'id-1',
  name: 'Name',
  category: 'Category',
  content: 'Content',
  lastReviewDate: null,
  reviewCount: 0,
  nextReviewDate: day('2026-03-17'),
  createdDate: day('2026-01-01'),
  ...overrides,
});

describe('markCardReviewed lastReviewDate (AC1)', () => {
  it('sets lastReviewDate to the injected today', () => {
    const reviewed = markCardReviewed(reviewedCard(), TODAY);

    expect(reviewed.lastReviewDate).toBe(TODAY);
  });
});

describe('markCardReviewed reviewCount (AC2)', () => {
  it('increments reviewCount from 0 to 1', () => {
    const reviewed = markCardReviewed(reviewedCard({ reviewCount: 0 }), TODAY);

    expect(reviewed.reviewCount).toBe(1);
  });

  it('increments reviewCount on a later review', () => {
    const reviewed = markCardReviewed(reviewedCard({ reviewCount: 3 }), TODAY);

    expect(reviewed.reviewCount).toBe(4);
  });
});

describe('markCardReviewed nextReviewDate (AC3)', () => {
  it('sets nextReviewDate to today + 14 on the first review', () => {
    const reviewed = markCardReviewed(reviewedCard({ reviewCount: 0 }), TODAY);

    expect(reviewed.nextReviewDate).toBe('2026-03-24');
  });

  it('sources nextReviewDate from nextReviewDate(createdDate, today, reviewCount + 1)', () => {
    const card = reviewedCard({ reviewCount: 2 });

    const reviewed = markCardReviewed(card, TODAY);

    expect(reviewed.nextReviewDate).toBe(nextReviewDate(card.createdDate, TODAY, card.reviewCount + 1));
  });

  it('doubles the interval on the next review', () => {
    const reviewed = markCardReviewed(reviewedCard({ reviewCount: 1 }), TODAY);

    expect(reviewed.nextReviewDate).toBe('2026-04-07');
  });

  it('caps the interval at 365 when the new count reaches 6', () => {
    const reviewed = markCardReviewed(reviewedCard({ reviewCount: 5 }), TODAY);

    expect(reviewed.nextReviewDate).toBe('2027-03-10');
  });

  it('stays at 365 for high counts', () => {
    const reviewed = markCardReviewed(reviewedCard({ reviewCount: 19 }), TODAY);

    expect(reviewed.nextReviewDate).toBe('2027-03-10');
  });
});

describe('markCardReviewed immutability (AC4)', () => {
  it('returns a new object', () => {
    const card = reviewedCard({ reviewCount: 2 });

    const reviewed = markCardReviewed(card, TODAY);

    expect(reviewed).not.toBe(card);
  });

  it('does not mutate the input', () => {
    const card = reviewedCard({ reviewCount: 2 });
    const before = { ...card };

    markCardReviewed(card, TODAY);

    expect(card).toEqual(before);
  });
});

describe('markCardReviewed preserved fields (AC5)', () => {
  it('preserves id, name, category, content and createdDate', () => {
    const card = reviewedCard({
      id: 'id-42',
      name: 'Name kept',
      category: 'Category kept',
      content: 'Content kept',
      createdDate: day('2026-02-02'),
    });

    const reviewed = markCardReviewed(card, TODAY);

    expect(reviewed.id).toBe(card.id);
    expect(reviewed.name).toBe(card.name);
    expect(reviewed.category).toBe(card.category);
    expect(reviewed.content).toBe(card.content);
    expect(reviewed.createdDate).toBe(card.createdDate);
  });
});

describe('markCardReviewed purity (AC6)', () => {
  it('is deterministic for the same arguments', () => {
    const card = reviewedCard({ reviewCount: 2 });

    const first = markCardReviewed(card, TODAY);
    const second = markCardReviewed(card, TODAY);

    expect(first).toEqual(second);
  });

  describe('clock independence', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('is independent of the system clock when today is injected', () => {
      const card = reviewedCard({ reviewCount: 2 });

      vi.setSystemTime(new Date('1999-01-01T00:00:00Z'));
      const past = markCardReviewed(card, TODAY);

      vi.setSystemTime(new Date('2099-12-31T23:59:59Z'));
      const future = markCardReviewed(card, TODAY);

      expect(past).toEqual(future);
      expect(past.lastReviewDate).toBe(TODAY);
    });
  });

  describe('default today', () => {
    const originalTz = process.env.TZ;

    beforeEach(() => {
      process.env.TZ = 'America/Sao_Paulo';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      if (originalTz === undefined) delete process.env.TZ;
      else process.env.TZ = originalTz;
    });

    it('defaults today to todayLocal()', () => {
      vi.setSystemTime(new Date('2026-03-10T12:00:00-03:00'));

      const reviewed = markCardReviewed(reviewedCard({ reviewCount: 0 }));

      expect(reviewed.lastReviewDate).toBe(todayLocal());
      expect(reviewed.lastReviewDate).toBe('2026-03-10');
    });
  });
});
