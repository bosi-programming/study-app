import type { Deps } from './clock.ts'
import { InvalidDifficultyError, InvalidFieldError } from './errors.ts'
import { BASE_INTERVAL_DAYS, initialDueDate } from './schedule.ts'

export type Difficulty = 1 | 2 | 3 | 4 | 5

export type ItemStatus = 'active' | 'archived' | 'cold'

export type Item = {
  readonly id: string
  readonly title: string
  readonly subject: string
  readonly difficulty: Difficulty
  readonly note: string | null
  readonly link: string | null
  readonly interval_days: number
  readonly due_date: string
  readonly review_count: number
  readonly on_time_streak: number
  readonly status: ItemStatus
  readonly last_reviewed_at: string | null
  readonly archived_at: string | null
  readonly cold_archived_at: string | null
  readonly created_at: string
  readonly updated_at: string
}

export type ItemInput = {
  readonly title: string
  readonly subject: string
  readonly difficulty: number
  readonly note?: string | null
  readonly link?: string | null
}

const TITLE_MAX_LENGTH = 200
const SUBJECT_MAX_LENGTH = 60
const NOTE_MAX_LENGTH = 10_000

const MIN_DIFFICULTY = 1
const MAX_DIFFICULTY = 5

export function toDifficulty(value: number): Difficulty {
  if (!Number.isInteger(value) || value < MIN_DIFFICULTY || value > MAX_DIFFICULTY) {
    throw new InvalidDifficultyError(value)
  }
  return value as Difficulty
}

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return value.trim().length === 0 ? null : value
}

export function validateTitle(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new InvalidFieldError('title', 'título é obrigatório')
  if (trimmed.length > TITLE_MAX_LENGTH) {
    throw new InvalidFieldError(
      'title',
      `título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres`,
    )
  }
  return trimmed
}

export function validateSubject(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new InvalidFieldError('subject', 'matéria é obrigatória')
  if (trimmed.length > SUBJECT_MAX_LENGTH) {
    throw new InvalidFieldError(
      'subject',
      `matéria deve ter no máximo ${SUBJECT_MAX_LENGTH} caracteres`,
    )
  }
  return trimmed
}

export function validateNote(value: string | null | undefined): string | null {
  const note = blankToNull(value)
  if (note !== null && note.length > NOTE_MAX_LENGTH) {
    throw new InvalidFieldError(
      'note',
      `nota deve ter no máximo ${NOTE_MAX_LENGTH} caracteres`,
    )
  }
  return note
}

export function validateLink(value: string | null | undefined): string | null {
  return blankToNull(value)
}

export function createItem(input: ItemInput, deps: Deps): Item {
  const difficulty = toDifficulty(input.difficulty)
  const title = validateTitle(input.title)
  const subject = validateSubject(input.subject)
  const note = validateNote(input.note)
  const link = validateLink(input.link)

  const now = deps.clock.nowUtc()
  const today = deps.clock.todayLocalDate()

  return {
    id: deps.ids(),
    title,
    subject,
    difficulty,
    note,
    link,
    interval_days: BASE_INTERVAL_DAYS[difficulty],
    due_date: initialDueDate(difficulty, today),
    review_count: 0,
    on_time_streak: 0,
    status: 'active',
    last_reviewed_at: null,
    archived_at: null,
    cold_archived_at: null,
    created_at: now,
    updated_at: now,
  }
}
