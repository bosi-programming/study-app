import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type Deps } from '@study/core'
import { migrateColdArchive } from './coldArchive.ts'
import { migrationFailedLine, migratedLine } from './output/human.ts'
import { type Store, openStore } from './persistence/index.ts'
import { systemDeps } from './deps.ts'
import { CliError } from './errors.ts'

export type CommandContext = {
  readonly dbPath: string
  readonly dbExisted: boolean
  readonly deps: Deps
  readonly store: Store
  readonly interactive: boolean
  readonly json: boolean
  readonly exportDir: string | null
  close(): void
}

export type ContextOptions = {
  readonly dbPath: string | undefined
  readonly json: boolean
  readonly noInput: boolean
  readonly exportDir: string | undefined
}

export function resolveDbPath(
  explicit: string | undefined,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): string {
  if (explicit !== undefined && explicit.length > 0) return explicit
  const fromEnv = env.STUDY_DB
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv
  return defaultDbPath(env, platform)
}

function defaultDbPath(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string {
  if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'study-app', 'study.db')
  }
  if (platform === 'win32') {
    return join(env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'study-app', 'study.db')
  }
  return join(env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'), 'study-app', 'study.db')
}

export function withContext<T>(options: ContextOptions, run: (ctx: CommandContext) => T): T {
  const built = buildContext(options)
  try {
    const result = run(built.ctx)
    if (built.migrationLine !== null) process.stderr.write(`${built.migrationLine}\n`)
    return result
  } finally {
    built.ctx.close()
  }
}

type BuiltContext = {
  readonly ctx: CommandContext
  readonly migrationLine: string | null
}

function buildContext(options: ContextOptions): BuiltContext {
  const dbPath = resolveDbPath(options.dbPath, process.env, process.platform)
  const dbExisted = existsSync(dbPath)
  const store = openStore(dbPath)
  let closed = false

  const close = (): void => {
    if (closed) return
    closed = true
    store.close()
  }

  const version = store.schemaVersion()
  if (version !== 1) {
    close()
    throw CliError.unsupportedSchema(version ?? 0)
  }

  const ctx: CommandContext = {
    dbPath,
    dbExisted,
    deps: systemDeps,
    store,
    interactive: process.stdin.isTTY === true && !options.json && !options.noInput,
    json: options.json,
    exportDir: options.exportDir ?? null,
    close,
  }

  return { ctx, migrationLine: coldArchiveWarningLine(store, dbPath, ctx.exportDir) }
}

function coldArchiveWarningLine(
  store: Store,
  dbPath: string,
  exportDir: string | null,
): string | null {
  const result = migrateColdArchive({
    store,
    deps: systemDeps,
    exportDir,
    dbPath,
    today: systemDeps.clock.todayLocalDate(),
  })
  if (result.exportPath === null) return null
  return result.exportError === null
    ? migratedLine(result.migrated, result.exportPath)
    : migrationFailedLine(result.exportPath)
}
