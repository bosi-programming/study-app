import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type CalendarDay, addDays, todayLocal } from '../src/data.ts';
import { createCard } from '../src/card.ts';

const day = (value: string): CalendarDay => value as CalendarDay;

describe('todayLocal (AC4)', () => {
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

  it('is the default today for createCard', () => {
    vi.setSystemTime(new Date('2026-03-10T12:00:00-03:00'));

    const card = createCard({
      name: 'Name',
      category: 'Category',
      content: 'Content',
    });

    expect(card.createdDate).toBe(todayLocal());
    expect(card.createdDate).toBe('2026-03-10');
  });

  it('records the local day, not UTC, at 23:59', () => {
    vi.setSystemTime(new Date('2026-03-10T23:59:00-03:00'));

    expect(todayLocal()).toBe('2026-03-10');
  });
});

describe('addDays (AC5)', () => {
  it('+0 is idempotent', () => {
    const base = day('2026-03-10');

    expect(addDays(base, 0)).toBe(base);
  });

  it('+7 within the same month', () => {
    expect(addDays(day('2026-03-10'), 7)).toBe('2026-03-17');
  });

  it('crosses a month boundary', () => {
    expect(addDays(day('2026-01-28'), 7)).toBe('2026-02-04');
  });

  it('crosses a year boundary', () => {
    expect(addDays(day('2026-12-29'), 7)).toBe('2027-01-05');
  });

  it('handles leap years', () => {
    expect(addDays(day('2024-02-28'), 1)).toBe('2024-02-29');
    expect(addDays(day('2024-02-29'), 1)).toBe('2024-03-01');
  });

  it('preserves the YYYY-MM-DD format', () => {
    expect(addDays(day('2026-02-28'), 1)).toBe('2026-03-01');
  });

  it('accepts negative days', () => {
    expect(addDays(day('2026-03-10'), -7)).toBe('2026-03-03');
    expect(addDays(day('2026-03-01'), -1)).toBe('2026-02-28');
  });
});
