export type CalendarDay = string & { readonly __brand: 'CalendarDay' };

function format(year: number, month: number, day: number): CalendarDay {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}` as CalendarDay;
}

function toLocalDay(date: Date): CalendarDay {
  return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function todayLocal(): CalendarDay {
  return toLocalDay(new Date());
}

export function addDays(day: CalendarDay, days: number): CalendarDay {
  const [year = '0', month = '1', dayOfMonth = '1'] = day.split('-');
  const base = Date.UTC(Number(year), Number(month) - 1, Number(dayOfMonth));
  const result = new Date(base + days * 86_400_000);
  return format(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    result.getUTCDate(),
  );
}
