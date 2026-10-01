import { openContext } from '../../context.ts'
import { type KeyCommand } from '../keys.ts'
import { render, type RenderViewport } from '../render/index.ts'
import {
  openSession,
  type Session,
  type SessionAction,
  type SessionState,
} from '../session/index.ts'
import { buildRenderState } from './buildRenderState.ts'
import { isUtf8Locale } from './isUtf8Locale.ts'
import { peel } from './peel.ts'
import { type TuiOptions, type TuiOutcome } from './types.ts'

export async function runTui(options: TuiOptions): Promise<TuiOutcome> {
  const open = options.open ?? openContext
  const opened = open({
    dbPath: options.dbPath,
    exportDir: options.exportDir,
    deps: options.deps,
    skipSchemaGate: false,
    skipMigrationHook: false,
    skipStreakHook: false,
  })

  let session: Session
  try {
    session = openSession({
      dbPath: options.dbPath,
      exportDir: options.exportDir,
      deps: options.deps,
      open: () => opened,
    })
  } catch (error) {
    opened.close()
    throw error
  }

  const terminal = options.terminal
  const store = opened.store
  const color = options.color
  const utf8 = isUtf8Locale(options.env)
  let viewport: RenderViewport = terminal.size()
  let buffer = ''
  let confirmed = false
  let frame: string | null = null

  const paint = (state: SessionState, force: boolean): TuiOutcome | null => {
    if (state.fatal !== null) {
      terminal.error(state.fatal.message)
      return 'fatal'
    }

    let next: string
    try {
      next = render(buildRenderState({ state, store, confirmed, viewport, color, utf8 }))
    } catch (error) {
      terminal.error(messageOf(error))
      return 'fatal'
    }

    if (force || next !== frame) {
      terminal.write(next)
      frame = next
    }
    return null
  }

  try {
    const initial = paint(session.beforeRender(), false)
    if (initial !== null) return initial

    for (;;) {
      const event = await terminal.next()
      if (event === null) return 'interrupt'

      if (event.kind === 'resize') {
        viewport = { columns: event.columns, rows: event.rows }
        const resized = paint(session.state(), true)
        if (resized !== null) return resized
        continue
      }

      buffer += event.chunk
      const rolled = paint(session.beforeRender(), false)
      if (rolled !== null) return rolled

      let state = session.state()
      while (buffer.length > 0) {
        const step = peel(buffer, state.screen)
        buffer = step.rest
        if (step.commands.length === 0) break

        for (const command of step.commands) {
          if (command.kind === 'quit') return 'quit'
          if (command.kind === 'interrupt') return 'interrupt'

          const action = sessionActionOf(command)
          if (action === null) continue
          state = session.applyAction(action)
          confirmed = command.kind === 'check-in'
          const painted = paint(state, false)
          if (painted !== null) return painted
        }
      }
    }
  } finally {
    session.close()
  }
}

function sessionActionOf(command: KeyCommand): SessionAction | null {
  if (command.kind === 'quit' || command.kind === 'interrupt') return null
  return command
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
