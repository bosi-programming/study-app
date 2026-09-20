import type { Deps } from './clock.ts'
import { InvalidDifficultyError, InvalidFieldError } from './errors.ts'
import { BASE_INTERVAL_DAYS, initialDueDate } from './schedule.ts'

/** RN-01 — the 1–5 scale, narrowed from `number` at the boundary. */
export type Difficulty = 1 | 2 | 3 | 4 | 5

/** ADR-005 — `active` is in the queue; `archived` and `cold` are not. */
export type ItemStatus = 'active' | 'archived' | 'cold'

/**
 * The canonical entity from `docs/MODELO-DE-DADOS.md`, field for field. Derived
 * keys (`title_key`, `subject_key`) are deliberately absent: `titleKey` and
 * `subjectKey` compute them, and persistence stores them.
 */
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

/** Narrows a `number` to the 1–5 union, or throws `invalid-difficulty`. */
export function toDifficulty(value: number): Difficulty {
  if (!Number.isInteger(value) || value < MIN_DIFFICULTY || value > MAX_DIFFICULTY) {
    throw new InvalidDifficultyError(value)
  }
  return value as Difficulty
}

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/** MODELO: title 1–200 caracteres, sem espaços nas pontas. */
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

/** RN-12 — matéria é string livre; só precisa existir e caber em 60 caracteres. */
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

/** MODELO: nota opcional, agora até 10.000 caracteres; vazio vira `null`. */
export function validateNote(value: string | null | undefined): string | null {
  const trimmed = blankToNull(value)
  if (trimmed !== null && trimmed.length > NOTE_MAX_LENGTH) {
    throw new InvalidFieldError(
      'note',
      `nota deve ter no máximo ${NOTE_MAX_LENGTH} caracteres`,
    )
  }
  return trimmed
}

/** MODELO: link opcional, sem validação estrita na V1; vazio vira `null`. */
export function validateLink(value: string | null | undefined): string | null {
  return blankToNull(value)
}

/**
 * RF-01 / RN-02 — a brand new active item: `review_count = 0`,
 * `on_time_streak = 0`, the difficulty base interval, and the first due date.
 */
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
