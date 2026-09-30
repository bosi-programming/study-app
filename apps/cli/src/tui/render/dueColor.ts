import { type Item, isLate } from '@study/core'
import { ACCENT_HEX, MUTED_HEX, SUCCESS_HEX } from '../../output/color.ts'

export function dueColor(item: Item, today: string): string {
  if (isLate(item, today)) return ACCENT_HEX
  return item.due_date === today ? SUCCESS_HEX : MUTED_HEX
}
