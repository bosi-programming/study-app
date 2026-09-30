import { type SessionState } from './types.ts'

export function withFocus(state: SessionState, focusId: string | null): SessionState {
  if (state.screen !== 'detail') return { ...state, focusId }
  if (focusId === null) return { ...state, focusId: null, screen: 'queue', detailItemId: null }
  return { ...state, focusId, detailItemId: focusId }
}
