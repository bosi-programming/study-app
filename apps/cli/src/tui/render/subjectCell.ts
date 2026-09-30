import { truncate } from './truncate.ts'
import { width } from './width.ts'

export function subjectCell(subject: string, limit: number): string {
  const bracketed = `[${subject}]`
  if (width(bracketed) <= limit) return bracketed
  return `[${truncate(subject, limit - 3)}]`
}
