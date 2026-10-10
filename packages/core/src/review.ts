import type { CalendarDay } from './data.ts';
import { addDays } from './data.ts';

export function nextReviewDate(
  createdDate: CalendarDay,
  lastReviewDate: CalendarDay | null,
  reviewCount: number,
): CalendarDay {
  const interval = Math.min(7 * 2 ** reviewCount, 365);
  const base = reviewCount === 0 ? createdDate : lastReviewDate!;
  return addDays(base, interval);
}
