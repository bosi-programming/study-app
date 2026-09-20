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
