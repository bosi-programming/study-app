import { type ContextHookTarget, runEntryHooks } from '../../context.ts'
import { readQueueStreak, rollQueueStreak } from '../../model/queueStreak.ts'
import { dispatch } from './dispatch.ts'
import { failureState } from './failureState.ts'
import { reconcileFocus } from './reconcileFocus.ts'
import { settle } from './settle.ts'
import { type SessionAction, type SessionState, type StoreTracker } from './types.ts'

export function apply(
  target: ContextHookTarget,
  tracker: StoreTracker,
  state: SessionState,
  action: SessionAction,
): SessionState {
  if (state.fatal !== null) return state

  tracker.reset()
  try {
    const today = target.deps.clock.todayLocalDate()
    const migrationLine = runEntryHooks(target, today)
    const queue = target.store.dueItems(today)
    const focusId = reconcileFocus(state.focusId, state.queue, queue)
    const reread = settle({ ...state, today }, queue, focusId)
    const dispatched = dispatch(target, reread, action)

    rollQueueStreak(target.store, today)
    const finalQueue = target.store.dueItems(today)
    const finalFocusId = reconcileFocus(dispatched.focusId, dispatched.queue, finalQueue)
    const streak = readQueueStreak(target.store)
    const settled = settle(
      { ...dispatched, today, queue: finalQueue, focusId: finalFocusId },
      finalQueue,
      finalFocusId,
    )

    return {
      ...settled,
      streak,
      banner: migrationLine === null ? null : { kind: 'info', message: migrationLine },
    }
  } catch (error) {
    return failureState(state, tracker, error)
  }
}
