import { type Item } from './entity.ts'

const COMBINING_MARKS = /[\u0300-\u036f]/g

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim()
}

export function titleKey(item: Pick<Item, 'title'>): string {
  return normalizeText(item.title)
}

export function subjectKey(item: Pick<Item, 'subject'>): string {
  return normalizeText(item.subject)
}
