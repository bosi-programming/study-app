import { type Deps, type Difficulty, type Item, type QueueStreak } from '@study/core'
import { type OpenedContext, type OpenContextOptions } from '../../context.ts'
import { type Store } from '../../persistence/index.ts'

export type SessionScreen = 'queue' | 'detail' | 'reevaluate' | 'help'

export type ReevaluationState = {
  readonly itemId: string
  readonly currentDifficulty: Difficulty
}

export type SessionBanner = {
  readonly kind: 'info' | 'warning'
  readonly message: string
}

export type SessionFatal = {
  readonly message: string
}

export type SessionState = {
  readonly today: string
  readonly screen: SessionScreen
  readonly queue: readonly Item[]
  readonly focusId: string | null
  readonly detailItemId: string | null
  readonly reevaluation: ReevaluationState | null
  readonly streak: QueueStreak
  readonly banner: SessionBanner | null
  readonly fatal: SessionFatal | null
}

export type SessionAction =
  | { readonly kind: 'focus-next' }
  | { readonly kind: 'focus-prev' }
  | { readonly kind: 'focus-first' }
  | { readonly kind: 'focus-last' }
  | { readonly kind: 'open-detail' }
  | { readonly kind: 'close-detail' }
  | { readonly kind: 'start-reevaluate' }
  | { readonly kind: 'cancel-reevaluate' }
  | { readonly kind: 'toggle-help' }
  | { readonly kind: 'check-in' }
  | { readonly kind: 'reevaluate'; readonly difficulty: number }

export type SessionOptions = {
  readonly dbPath: string | undefined
  readonly exportDir: string | undefined
  readonly deps?: Deps
  readonly open?: (options: OpenContextOptions) => OpenedContext
}

export type Session = {
  state(): SessionState
  beforeRender(): SessionState
  applyAction(action: SessionAction): SessionState
  close(): void
}

export type StoreTracker = {
  reset(): void
  hasFailure(): boolean
  wrap(store: Store): Store
}
