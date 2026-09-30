import { type ContextHookTarget, openContext } from '../../context.ts'
import { systemDeps } from '../../deps.ts'
import { apply } from './apply.ts'
import { buildState } from './buildState.ts'
import { createStoreTracker } from './createStoreTracker.ts'
import { render } from './render.ts'
import { type Session, type SessionOptions } from './types.ts'

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
