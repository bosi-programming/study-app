import { type Deps } from './clock.ts'
import { toDifficulty } from './difficulty.ts'
import { type Item, type ItemInput } from './entity.ts'
import { InvalidFieldError } from './errors.ts'
import { BASE_INTERVAL_DAYS, initialDueDate } from './schedule.ts'

const TITLE_MAX_LENGTH = 200
const SUBJECT_MAX_LENGTH = 60
const NOTE_MAX_LENGTH = 10_000

type TextRule = {
  readonly field: string
  readonly label: string
  readonly maxLength: number
}

type RequiredTextRule = TextRule & { readonly emptyMessage: string }

const TITLE_RULE: RequiredTextRule = {
  field: 'title',
  label: 'título',
  maxLength: TITLE_MAX_LENGTH,
  emptyMessage: 'título é obrigatório',
}

const SUBJECT_RULE: RequiredTextRule = {
  field: 'subject',
  label: 'matéria',
  maxLength: SUBJECT_MAX_LENGTH,
  emptyMessage: 'matéria é obrigatória',
}

const NOTE_RULE: TextRule = {
  field: 'note',
  label: 'nota',
  maxLength: NOTE_MAX_LENGTH,
}

function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return value.trim().length === 0 ? null : value
}

function assertWithinMaxLength(value: string, rule: TextRule): void {
  if (value.length > rule.maxLength) {
    throw new InvalidFieldError(
      rule.field,
      `${rule.label} deve ter no máximo ${rule.maxLength} caracteres`,
    )
  }
}

function validateRequiredText(value: string, rule: RequiredTextRule): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new InvalidFieldError(rule.field, rule.emptyMessage)
  assertWithinMaxLength(trimmed, rule)
  return trimmed
}

export function validateTitle(value: string): string {
  return validateRequiredText(value, TITLE_RULE)
}

export function validateSubject(value: string): string {
  return validateRequiredText(value, SUBJECT_RULE)
}

export function validateNote(value: string | null | undefined): string | null {
  const note = blankToNull(value)
  if (note !== null) assertWithinMaxLength(note, NOTE_RULE)
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
