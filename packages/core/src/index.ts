export const CORE_VERSION = '0.0.0'

export {
  AmbiguousRefError,
  CoreError,
  InvalidDifficultyError,
  InvalidFieldError,
  InvalidRefError,
  ItemNotActiveError,
  NotFoundError,
} from './errors.ts'

export type { CoreErrorContext, CoreErrorKind } from './errors.ts'

export { addDays, compareDates, daysBetween, isValidLocalDate, previousDay } from './localDate.ts'
export type { DateOrder } from './localDate.ts'

export type { Clock, Deps, IdGenerator } from './clock.ts'

export { normalizeText, subjectKey, titleKey } from './normalize.ts'

export {
  createItem,
  toDifficulty,
  validateLink,
  validateNote,
  validateSubject,
  validateTitle,
} from './item.ts'
export type { Difficulty, Item, ItemInput, ItemStatus } from './item.ts'

export {
  BASE_INTERVAL_DAYS,
  DIFFICULTY_LABELS,
  MAX_INTERVAL_DAYS,
  initialDueDate,
  intervalFor,
  nextDueDate,
} from './schedule.ts'
