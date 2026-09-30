import {
  type Deps,
  type Difficulty,
  type Item,
  type QueueStreak,
  recordReview,
  reevaluateDifficulty,
} from '@study/core'
import {
  type ContextHookTarget,
  type OpenedContext,
  type OpenContextOptions,
  openContext,
  runEntryHooks,
} from '../context.ts'
import { systemDeps } from '../deps.ts'
import { type Store } from '../persistence/index.ts'
import { readQueueStreak, rollQueueStreak } from '../queueStreak.ts'

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

type StoreTracker = {
  reset(): void
  hasFailure(): boolean
  failureError(): unknown
  wrap(store: Store): Store
}

function createStoreTracker(): StoreTracker {
  let failed = false
  let failure: unknown = null

  return {
    reset() {
      failed = false
      failure = null
    },
    hasFailure: () => failed,
    failureError: () => failure,
    wrap(store) {
      return {
        ...store,
        transaction: <T>(run: () => T): T => {
          try {
            return store.transaction(run)
          } catch (error) {
            failed = true
            failure = error
            throw error
          }
        },
      }
    },
  }
}

export function openSession(options: SessionOptions): Session {
  const deps = options.deps ?? systemDeps
  const open = options.open ?? openContext
  const opened = open({
    dbPath: options.dbPath,
    exportDir: options.exportDir,
    deps,
    skipSchemaGate: false,
    skipMigrationHook: false,
    skipStreakHook: false,
  })

  const tracker = createStoreTracker()
  const store = tracker.wrap(opened.store)
  const target: ContextHookTarget = {
    store,
    deps,
    exportDir: opened.exportDir,
    dbPath: opened.dbPath,
  }

  let closed = false
  const close = (): void => {
    if (closed) return
    closed = true
    opened.close()
  }

  let current = buildState(target, tracker, opened.migrationLine)

  return {
    state: () => current,
    beforeRender: () => {
      current = render(target, tracker, current)
      return current
    },
    applyAction: (action) => {
      current = apply(target, tracker, current, action)
      return current
    },
    close,
  }
}

function buildState(
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
      streak,
      banner: migrationLine === null ? null : { kind: 'info', message: migrationLine },
      fatal: null,
    }
  } catch (error) {
    return failureState(emptyState(today), tracker, error)
  }
}

function render(target: ContextHookTarget, tracker: StoreTracker, state: SessionState): SessionState {
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

function apply(
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

function dispatch(
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
    case 'check-in':
      return checkIn(target, state)
    case 'reevaluate':
      return reevaluate(target, state, action.difficulty)
  }
}

function checkIn(target: ContextHookTarget, state: SessionState): SessionState {
  const id = state.focusId
  if (id === null) return state

  const item = target.store.getItem(id)
  if (item === null) return state

  const result = recordReview(item, target.deps)
  target.store.transaction(() => {
    target.store.saveItem(result.item)
    target.store.saveReviewLog(result.log)
  })
  return state
}

function reevaluate(
  target: ContextHookTarget,
  state: SessionState,
  difficulty: number,
): SessionState {
  const reevaluation = state.reevaluation
  if (reevaluation === null) return { ...state, screen: 'queue' }

  const stillQueued = state.queue.some((item) => item.id === reevaluation.itemId)
  const item = stillQueued ? target.store.getItem(reevaluation.itemId) : null
  if (item === null || item.status !== 'active') {
    return { ...state, screen: 'queue', reevaluation: null }
  }

  const next = reevaluateDifficulty(item, difficulty, target.deps)
  if (next !== item) target.store.transaction(() => target.store.saveItem(next))
  return { ...state, screen: 'queue', reevaluation: null }
}

function startReevaluation(state: SessionState): SessionState {
  const item = state.queue.find((candidate) => candidate.id === state.focusId)
  if (item === undefined) return state
  return {
    ...state,
    screen: 'reevaluate',
    reevaluation: { itemId: item.id, currentDifficulty: item.difficulty },
  }
}

function withFocus(state: SessionState, focusId: string | null): SessionState {
  if (state.screen !== 'detail') return { ...state, focusId }
  if (focusId === null) return { ...state, focusId: null, screen: 'queue', detailItemId: null }
  return { ...state, focusId, detailItemId: focusId }
}

function settle(state: SessionState, queue: readonly Item[], focusId: string | null): SessionState {
  let screen = state.screen
  let detailItemId = state.detailItemId
  let reevaluation = state.reevaluation

  if (screen === 'detail') {
    if (focusId === null) {
      screen = 'queue'
      detailItemId = null
    } else {
      detailItemId = focusId
    }
  }

  if (reevaluation !== null) {
    const reevaluationId = reevaluation.itemId
    if (!queue.some((item) => item.id === reevaluationId)) reevaluation = null
  }

  return { ...state, queue, focusId, screen, detailItemId, reevaluation }
}

function moveFocus(
  queue: readonly Item[],
  focusId: string | null,
  step: 'next' | 'prev' | 'first' | 'last',
): string | null {
  if (queue.length === 0) return null
  if (step === 'first') return queue[0]?.id ?? null
  if (step === 'last') return queue[queue.length - 1]?.id ?? null

  const index = queue.findIndex((item) => item.id === focusId)
  const current = index < 0 ? 0 : index
  const next = step === 'next' ? Math.min(current + 1, queue.length - 1) : Math.max(current - 1, 0)
  return queue[next]?.id ?? null
}

function initialFocusId(queue: readonly Item[], today: string): string | null {
  const late = queue.find((item) => item.due_date < today)
  return late?.id ?? queue[0]?.id ?? null
}

function reconcileFocus(
  focusId: string | null,
  previousQueue: readonly Item[],
  nextQueue: readonly Item[],
): string | null {
  if (nextQueue.length === 0) return null
  if (focusId !== null && nextQueue.some((item) => item.id === focusId)) return focusId

  const previousIndex = focusId === null ? 0 : previousQueue.findIndex((item) => item.id === focusId)
  const index = Math.min(previousIndex < 0 ? 0 : previousIndex, nextQueue.length - 1)
  return nextQueue[index]?.id ?? null
}

function emptyState(today: string): SessionState {
  return {
    today,
    screen: 'queue',
    queue: [],
    focusId: null,
    detailItemId: null,
    reevaluation: null,
    streak: { streak_current: 0, streak_last_day: null },
    banner: null,
    fatal: null,
  }
}

function failureState(
  previous: SessionState,
  tracker: StoreTracker,
  error: unknown,
): SessionState {
  if (tracker.hasFailure()) {
    return { ...previous, banner: { kind: 'warning', message: messageOf(error) } }
  }
  return { ...previous, fatal: { message: messageOf(error) } }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
