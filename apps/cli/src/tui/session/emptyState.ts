import { type SessionState } from './types.ts'

export function emptyState(today: string): SessionState {
  return {
    today,
    screen: 'queue',
    queue: [],
    focusId: null,
    detailItemId: null,
    reevaluation: null,
    form: null,
    cold: null,
    items: null,
    config: null,
    path: null,
    confirmation: null,
    streak: { streak_current: 0, streak_last_day: null },
    banner: null,
    fatal: null,
  }
}
