import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CalendarDay, addDays } from '../src/data.ts';
import { nextReviewDate } from '../src/review.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

const BASE = day('2026-01-01');

describe('interval table & ceiling (AC1)', () => {
  it('doubles below the ceiling', () => {
    const intervals: Array<[number, number]> = [
      [0, 7],
      [1, 14],
      [2, 28],
      [3, 56],
      [4, 112],
      [5, 224],
    ];

    for (const [reviewCount, interval] of intervals) {
      expect(nextReviewDate(BASE, BASE, reviewCount)).toBe(addDays(BASE, interval));
    }
  });

  it('cuts 448 to 365 at count 6', () => {
    expect(nextReviewDate(BASE, BASE, 6)).toBe(addDays(BASE, 365));
  });

  it('stays at 365 for counts 7 and above', () => {
    expect(nextReviewDate(BASE, BASE, 7)).toBe(addDays(BASE, 365));
    expect(nextReviewDate(BASE, BASE, 20)).toBe(addDays(BASE, 365));
  });
});

describe('base selection (AC2)', () => {
  it('uses createdDate when count is 0', () => {
    expect(nextReviewDate(day('2026-01-01'), null, 0)).toBe('2026-01-08');
  });

  it('uses lastReviewDate when count is above 0', () => {
    expect(nextReviewDate(day('2020-01-01'), day('2026-01-01'), 1)).toBe('2026-01-15');
  });

  it('ignores lastReviewDate when count is 0', () => {
    expect(nextReviewDate(day('2026-01-01'), day('2025-06-01'), 0)).toBe('2026-01-08');
  });
});

describe('calendar arithmetic (AC3)', () => {
  it('crosses a year boundary', () => {
    expect(nextReviewDate(day('2026-12-29'), null, 0)).toBe('2027-01-05');
  });

  it('respects leap years', () => {
    expect(nextReviewDate(day('2024-02-28'), null, 0)).toBe('2024-03-06');
  });
});

describe('purity (AC4)', () => {
  it('is deterministic for the same arguments', () => {
    const first = nextReviewDate(day('2026-05-01'), day('2026-05-01'), 2);
    const second = nextReviewDate(day('2026-05-01'), day('2026-05-01'), 2);

    expect(first).toBe(second);
  });

  describe('is independent of the clock', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns the same date under distant system clocks', () => {
      vi.setSystemTime(new Date('1999-01-01T00:00:00Z'));
      const past = nextReviewDate(day('2026-01-01'), null, 0);

      vi.setSystemTime(new Date('2099-12-31T23:59:59Z'));
      const future = nextReviewDate(day('2026-01-01'), null, 0);

      expect(past).toBe('2026-01-08');
      expect(future).toBe('2026-01-08');
    });
  });
});
