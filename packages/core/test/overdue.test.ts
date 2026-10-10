import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Card } from '../src/card.ts';
import { type CalendarDay } from '../src/data.ts';
import { isOverdue } from '../src/overdue.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

const card = (name: string, nextReviewDate: CalendarDay): Card => ({
  id: `${name}-${nextReviewDate}`,
  name,
  category: 'Category',
  content: 'Content',
  lastReviewDate: null,
  reviewCount: 0,
  nextReviewDate,
  createdDate: day('2026-03-10'),
});

describe('isOverdue when nextReviewDate is in the past (AC1)', () => {
  it.each<[string, string, boolean]>([
    ['one day in the past', '2026-10-09', true],
    ['across a month boundary', '2026-09-30', true],
    ['across a year boundary', '2025-12-31', true],
    ['a far-past date', '2020-01-01', true],
  ])('is overdue for a nextReviewDate %s', (_label, nextReviewDate, expected) => {
    expect(isOverdue(card('A', day(nextReviewDate)), day('2026-10-10'))).toBe(expected);
  });
});

describe('isOverdue when nextReviewDate equals today (AC2)', () => {
  it.each<[string, string, string, boolean]>([
    ['equals today', '2026-10-10', '2026-10-10', false],
    ['equals today at a month start', '2026-10-01', '2026-10-01', false],
  ])('is not overdue when nextReviewDate %s', (_label, nextReviewDate, today, expected) => {
    expect(isOverdue(card('A', day(nextReviewDate)), day(today))).toBe(expected);
  });
});

describe('isOverdue when nextReviewDate is in the future (AC3)', () => {
  it.each<[string, string, string, boolean]>([
    ['one day in the future', '2026-10-11', '2026-10-10', false],
    ['across a month boundary', '2026-11-01', '2026-10-31', false],
    ['a far-future date', '2027-01-01', '2026-10-10', false],
  ])('is not overdue for a nextReviewDate %s', (_label, nextReviewDate, today, expected) => {
    expect(isOverdue(card('A', day(nextReviewDate)), day(today))).toBe(expected);
  });
});

describe('day-only comparison ignores time (AC4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('compares only the calendar day of equal literals', () => {
    vi.setSystemTime(new Date('2026-10-10T23:59:59'));

    expect(isOverdue(card('A', day('2026-10-10')), day('2026-10-10'))).toBe(false);
  });
});

describe('purity (AC5)', () => {
  it('returns a boolean for both outcomes', () => {
    expect(isOverdue(card('Past', day('2026-10-09')), day('2026-10-10'))).toBeTypeOf('boolean');
    expect(isOverdue(card('Future', day('2026-10-11')), day('2026-10-10'))).toBeTypeOf('boolean');
  });

  it('is deterministic for the same arguments', () => {
    const entry = card('A', day('2026-10-09'));

    const first = isOverdue(entry, day('2026-10-10'));
    const second = isOverdue(entry, day('2026-10-10'));

    expect(first).toBe(second);
  });

  it('does not mutate the card', () => {
    const entry = card('A', day('2026-10-09'));
    const before = { ...entry };

    isOverdue(entry, day('2026-10-10'));

    expect(entry).toEqual(before);
  });

  describe('is independent of the system clock', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns the same result under distant system clocks', () => {
      vi.setSystemTime(new Date('1999-01-01T00:00:00Z'));
      const past = isOverdue(card('A', day('2026-10-09')), day('2026-10-10'));

      vi.setSystemTime(new Date('2099-12-31T23:59:59Z'));
      const future = isOverdue(card('A', day('2026-10-09')), day('2026-10-10'));

      expect(past).toBe(true);
      expect(future).toBe(true);
    });
  });
});
