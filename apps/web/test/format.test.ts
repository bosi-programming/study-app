import { describe, expect, it } from 'vitest';
import { type CalendarDay } from '@study/core';
import { formatCalendarDay } from '../src/format';

describe('formatCalendarDay (AC5)', () => {
  it('AC5 · formats a CalendarDay as pt-BR day/month/year', () => {
    expect(formatCalendarDay('2026-10-10' as CalendarDay)).toBe('10/10/2026');
  });

  it('AC5 · formats without a UTC day shift', () => {
    expect(formatCalendarDay('2026-01-01' as CalendarDay)).toBe('01/01/2026');
  });
});
