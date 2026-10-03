import {
  type Deps,
  type Item,
  reevaluateDifficulty,
  toDifficulty,
  validateLink,
  validateNote,
  validateSubject,
  validateTitle,
} from '@study/core'

export type ItemPatch = {
  readonly title?: string
  readonly subject?: string
  readonly note?: string | null
  readonly link?: string | null
  readonly difficulty?: number
}

export function updatedItem(current: Item, patch: ItemPatch, deps: Deps): Item {
  const next: Item = {
    ...current,
    title: patch.title === undefined ? current.title : validateTitle(patch.title),
    subject: patch.subject === undefined ? current.subject : validateSubject(patch.subject),
    note: patch.note === undefined ? current.note : validateNote(patch.note),
    link: patch.link === undefined ? current.link : validateLink(patch.link),
  }

  const difficulty =
    patch.difficulty === undefined ? current.difficulty : toDifficulty(patch.difficulty)

  if (difficulty !== current.difficulty) return reevaluateDifficulty(next, difficulty, deps)

  const fieldsChanged =
    next.title !== current.title ||
    next.subject !== current.subject ||
    next.note !== current.note ||
    next.link !== current.link

  return fieldsChanged ? { ...next, updated_at: deps.clock.nowUtc() } : next
}
