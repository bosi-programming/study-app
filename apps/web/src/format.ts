import { type CalendarDay } from '@study/core'

export function formatCalendarDay(day: CalendarDay): string {
  const [year = '', month = '', dayOfMonth = ''] = day.split('-')
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(dayOfMonth),
  )
  return new Intl.DateTimeFormat('pt-BR').format(localDate)
}
