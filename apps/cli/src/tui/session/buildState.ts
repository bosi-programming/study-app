import { type ContextHookTarget } from '../../context.ts'
import { readQueueStreak } from '../../model/queueStreak.ts'
import { emptyState } from './emptyState.ts'
import { failureState } from './failureState.ts'
import { initialFocusId } from './initialFocusId.ts'
import { type SessionState, type StoreTracker } from './types.ts'

export function buildState(
  target: ContextHookTarget,
  tracker: StoreTracker,
  migrationLine: string | null,
): SessionState {
  const today = target.deps.clock.todayLocalDate()
  tracker.reset()
  try {
    const queue = target.store.dueItems(today)
    const streak = readQueueStreak(target.store)
    return {
      today,
      screen: 'queue',
      queue,
      focusId: initialFocusId(queue, today),
      detailItemId: null,
      reevaluation: null,
      form: null,
      cold: null,
      config: null,
      path: null,
      confirmation: null,
      streak,
      banner: migrationLine === null ? null : { kind: 'info', message: migrationLine },
      fatal: null,
    }
  } catch (error) {
    return failureState(emptyState(today), tracker, error)
  }
}
