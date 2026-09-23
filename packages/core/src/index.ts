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
  validateLink,
  validateNote,
  validateSubject,
  validateTitle,
} from './item.ts'

export { toDifficulty } from './difficulty.ts'
export type { Difficulty, Item, ItemInput, ItemStatus } from './entity.ts'

export {
  BASE_INTERVAL_DAYS,
  DIFFICULTY_LABELS,
  MAX_INTERVAL_DAYS,
  daysLate,
  initialDueDate,
  intervalFor,
  isDue,
  isLate,
  nextDueDate,
  recordReview,
  reevaluateDifficulty,
} from './schedule.ts'
export type { ReviewLog, ReviewResult } from './schedule.ts'

export { advanceQueueStreak, hasDueItems } from './streak.ts'
export type { QueueStreak } from './streak.ts'

export { resolveRef } from './ref.ts'
