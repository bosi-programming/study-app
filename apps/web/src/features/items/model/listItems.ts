import { normalizeText, subjectKey, type Item, type ItemStatus } from '@study/core'
import { type LoadState } from '../../../loadState.ts'

export type ItemsResult = {
  readonly rows: readonly Item[]
  readonly subjects: readonly string[]
}

export type ItemsController = {
  readonly state: LoadState<ItemsResult>
  readonly filter: ItemsFilter
  setStatus(status: ItemStatus): void
  setSubject(subject: string): void
  setTerm(term: string): void
}

export type ItemsFilter = {
  readonly status: ItemStatus
  readonly subject: string
  readonly term: string
}

export const DEFAULT_ITEMS_FILTER: ItemsFilter = { status: 'active', subject: '', term: '' }

export function queryFilter(filter: ItemsFilter): { readonly status: ItemStatus; readonly subjectKey?: string } {
  return filter.subject.length === 0
    ? { status: filter.status }
    : { status: filter.status, subjectKey: subjectKey({ subject: filter.subject }) }
}

export function hasTerm(term: string): boolean {
  return normalizeText(term).length > 0
}

export function subjectOptions(items: readonly Item[]): readonly string[] {
  const byKey = new Map<string, string>()
  for (const item of items) byKey.set(subjectKey(item), item.subject)

  return [...byKey.entries()]
    .toSorted((left, right) => compareKeys(left[0], right[0]))
    .map(([, subject]) => subject)
}

function compareKeys(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}
