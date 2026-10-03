import { type Deps, type Difficulty, type Item, type QueueStreak } from '@study/core'
import { type OpenedContext, type OpenContextOptions } from '../../context.ts'
import { type Store } from '../../persistence/index.ts'
import { type FormField, type TextField } from '../fieldTypes.ts'

export type SessionScreen = 'queue' | 'detail' | 'reevaluate' | 'help' | 'form' | 'cold' | 'config' | 'path' | 'confirm' | 'items'

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

export type FormState = {
  readonly mode: 'add' | 'edit'
  readonly itemId: string | null
  readonly fields: Readonly<Record<FormField, TextField>>
  readonly baseline: Readonly<Record<FormField, string>>
  readonly focus: FormField
}

export type ColdState = {
  readonly focusId: string | null
}

export type ItemsState = {
  readonly focusId: string | null
}

export type ConfigState = {
  readonly editing: boolean
  readonly field: TextField
}

export type PathState = {
  readonly mode: 'export' | 'import'
  readonly field: TextField
}

export type ConfirmationAction =
  | { readonly kind: 'remove'; readonly itemId: string }
  | { readonly kind: 'purge'; readonly itemId: string }
  | { readonly kind: 'export'; readonly path: string }

export type ConfirmationState = {
  readonly action: ConfirmationAction
  readonly message: string
  readonly returnTo: SessionScreen
}

export type SessionState = {
  readonly today: string
  readonly screen: SessionScreen
  readonly queue: readonly Item[]
  readonly focusId: string | null
  readonly detailItemId: string | null
  readonly reevaluation: ReevaluationState | null
  readonly form: FormState | null
  readonly cold: ColdState | null
  readonly items: ItemsState | null
  readonly config: ConfigState | null
  readonly path: PathState | null
  readonly confirmation: ConfirmationState | null
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
  | { readonly kind: 'open-add' }
  | { readonly kind: 'open-edit' }
  | { readonly kind: 'archive' }
  | { readonly kind: 'unarchive' }
  | { readonly kind: 'request-remove' }
  | { readonly kind: 'open-cold' }
  | { readonly kind: 'close-cold' }
  | { readonly kind: 'open-items' }
  | { readonly kind: 'close-items' }
  | { readonly kind: 'cold-focus-prev' }
  | { readonly kind: 'cold-focus-next' }
  | { readonly kind: 'cold-restore' }
  | { readonly kind: 'cold-purge' }
  | { readonly kind: 'open-config' }
  | { readonly kind: 'open-export' }
  | { readonly kind: 'open-import' }
  | { readonly kind: 'form-enter' }
  | { readonly kind: 'form-cancel' }
  | { readonly kind: 'form-previous-field' }
  | { readonly kind: 'form-next-field' }
  | { readonly kind: 'field-insert'; readonly text: string }
  | { readonly kind: 'field-backspace' }
  | { readonly kind: 'field-delete' }
  | { readonly kind: 'field-left' }
  | { readonly kind: 'field-right' }
  | { readonly kind: 'field-home' }
  | { readonly kind: 'field-end' }
  | { readonly kind: 'confirm-yes' }
  | { readonly kind: 'confirm-no' }

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
