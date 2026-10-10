import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarDay } from '../src/data.ts';
import { nextReviewDate } from '../src/review.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

const BASE = day('2026-01-01');

describe('interval table & ceiling (AC1)', () => {
  it.each<[number, string]>([
    [0, '2026-01-08'],
    [1, '2026-01-15'],
    [2, '2026-01-29'],
    [3, '2026-02-26'],
    [4, '2026-04-23'],
    [5, '2026-08-13'],
  ])('doubles the interval at reviewCount %i', (reviewCount, expected) => {
    expect(nextReviewDate(BASE, BASE, reviewCount)).toBe(expected);
  });

  it('cuts 448 to 365 at count 6', () => {
    expect(nextReviewDate(BASE, BASE, 6)).toBe('2027-01-01');
  });

  it('stays at 365 for counts 7 and above', () => {
    expect(nextReviewDate(BASE, BASE, 7)).toBe('2027-01-01');
    expect(nextReviewDate(BASE, BASE, 20)).toBe('2027-01-01');
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

  it('falls back to createdDate when lastReviewDate is null above count 0', () => {
    expect(nextReviewDate(day('2026-01-01'), null, 5)).toBe('2026-08-13');
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
