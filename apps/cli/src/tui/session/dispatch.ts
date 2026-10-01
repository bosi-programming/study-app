import { type ContextHookTarget } from '../../context.ts'
import { checkIn } from './checkIn.ts'
import { moveFocus } from './moveFocus.ts'
import { reevaluate } from './reevaluate.ts'
import { startReevaluation } from './startReevaluation.ts'
import { type SessionAction, type SessionState } from './types.ts'
import { withFocus } from './withFocus.ts'

export function dispatch(
  target: ContextHookTarget,
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.kind) {
    case 'focus-next':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'next'))
    case 'focus-prev':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'prev'))
    case 'focus-first':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'first'))
    case 'focus-last':
      return withFocus(state, moveFocus(state.queue, state.focusId, 'last'))
    case 'open-detail':
      return state.focusId === null
        ? state
        : { ...state, screen: 'detail', detailItemId: state.focusId }
    case 'close-detail':
      return { ...state, screen: 'queue', detailItemId: null }
    case 'start-reevaluate':
      return startReevaluation(state)
    case 'cancel-reevaluate':
      return { ...state, screen: 'queue', reevaluation: null }
    case 'toggle-help':
      return { ...state, screen: state.screen === 'help' ? 'queue' : 'help' }
    case 'check-in': {
      const reevaluation = checkIn(target, state)
      return reevaluation === null
        ? state
        : { ...state, screen: 'reevaluate', reevaluation }
    }
    case 'reevaluate':
      return reevaluate(target, state, action.difficulty)
  }
}
