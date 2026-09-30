import { messageOf } from './messageOf.ts'
import { type SessionState, type StoreTracker } from './types.ts'

export function failureState(
  previous: SessionState,
  tracker: StoreTracker,
  error: unknown,
): SessionState {
  if (tracker.hasFailure()) {
    return { ...previous, banner: { kind: 'warning', message: messageOf(error) } }
  }
  return { ...previous, fatal: { message: messageOf(error) } }
}
