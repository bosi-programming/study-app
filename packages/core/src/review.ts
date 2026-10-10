import type { CalendarDay } from './data.ts';
import { addDays } from './data.ts';

const BASE_INTERVAL_DAYS = 7;
const MAX_INTERVAL_DAYS = 365;

export function nextReviewDate(
  createdDate: CalendarDay,
  lastReviewDate: CalendarDay | null,
  reviewCount: number,
): CalendarDay {
  const interval = Math.min(
    BASE_INTERVAL_DAYS * 2 ** reviewCount,
    MAX_INTERVAL_DAYS,
  );
  const base =
    reviewCount === 0 || lastReviewDate === null ? createdDate : lastReviewDate;
  return addDays(base, interval);
}
