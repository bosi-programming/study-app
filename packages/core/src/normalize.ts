import type { Item } from './item.ts'

const COMBINING_MARKS = /[\u0300-\u036f]/g

/**
 * Case- and accent-insensitive form used for every text comparison in the
 * domain: `title_key`, `subject_key` and `<ref>` resolution by title.
 * Only surrounding whitespace goes away — inner symbols survive.
 */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim()
}

export function titleKey(item: Pick<Item, 'title'>): string {
  return normalizeText(item.title)
}

export function subjectKey(item: Pick<Item, 'subject'>): string {
  return normalizeText(item.subject)
}
