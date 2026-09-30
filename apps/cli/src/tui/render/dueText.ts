import { type Item, daysLate, isLate } from '@study/core'

const OVERDUE_MARK = '!'
const OVERDUE_PREFIX = 'venceu '
const TODAY_TEXT = 'vence hoje'

export function dueText(item: Item, today: string, mark: boolean): string {
  if (!isLate(item, today)) return item.due_date === today ? TODAY_TEXT : item.due_date
  return `${mark ? `${OVERDUE_MARK} ` : ''}${OVERDUE_PREFIX}${item.due_date} (${daysLate(item, today)}d)`
}
