import { type ContextHookTarget, runEntryHooks } from '../../context.ts'
import { readQueueStreak } from '../../model/queueStreak.ts'
import { failureState } from './failureState.ts'
import { reconcileFocus } from './reconcileFocus.ts'
import { settle } from './settle.ts'
import { type SessionState, type StoreTracker } from './types.ts'

export function render(target: ContextHookTarget, tracker: StoreTracker, state: SessionState): SessionState {
  if (state.fatal !== null) return state

  const today = target.deps.clock.todayLocalDate()
  if (today === state.today) return state

  tracker.reset()
  try {
    const migrationLine = runEntryHooks(target, today)
    const queue = target.store.dueItems(today)
    const streak = readQueueStreak(target.store)
    const focusId = reconcileFocus(state.focusId, state.queue, queue)
    const settled = settle({ ...state, today }, queue, focusId)
    return {
      ...settled,
      streak,
      banner: migrationLine === null ? null : { kind: 'info', message: migrationLine },
    }
  } catch (error) {
    return failureState(state, tracker, error)
  }
}
