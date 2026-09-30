import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type Deps } from '@study/core'
import { migrateColdArchive } from './coldArchive.ts'
import { migrationFailedLine, migratedLine } from './output/human.ts'
import { type Store, openStore } from './persistence/index.ts'
import { systemDeps } from './deps.ts'
import { CliError } from './errors.ts'
import { rollQueueStreak } from './queueStreak.ts'

export type ContextHookTarget = {
  readonly store: Store
  readonly deps: Deps
  readonly exportDir: string | null
  readonly dbPath: string
}

export type OpenedContext = ContextHookTarget & {
  readonly dbExisted: boolean
  readonly migrationLine: string | null
  close(): void
}

export type OpenContextOptions = {
  readonly dbPath: string | undefined
  readonly exportDir: string | undefined
  readonly deps: Deps
  readonly skipSchemaGate: boolean
  readonly skipMigrationHook: boolean
  readonly skipStreakHook: boolean
}

export type EntryHookOptions = {
  readonly skipMigrationHook?: boolean
  readonly skipStreakHook?: boolean
}

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
  readonly skipSchemaGate: boolean
  readonly skipMigrationHook: boolean
  readonly skipStreakHook: boolean
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

export function openContext(options: OpenContextOptions): OpenedContext {
  const dbPath = resolveDbPath(options.dbPath, process.env, process.platform)
  const dbExisted = existsSync(dbPath)
  const store = openStoreOrCorrupt(dbPath, dbExisted)
  let closed = false

  const close = (): void => {
    if (closed) return
    closed = true
    store.close()
  }

  const version = store.schemaVersion()
  if (!options.skipSchemaGate && version !== 1) {
    close()
    throw CliError.unsupportedSchema(version ?? 0)
  }

  const target: ContextHookTarget = {
    store,
    deps: options.deps,
    exportDir: options.exportDir ?? null,
    dbPath,
  }

  let migrationLine: string | null
  try {
    migrationLine = runEntryHooks(target, options.deps.clock.todayLocalDate(), {
      skipMigrationHook: options.skipMigrationHook,
      skipStreakHook: options.skipStreakHook,
    })
  } catch (error) {
    close()
    throw error
  }

  return { ...target, dbExisted, migrationLine, close }
}

export function runEntryHooks(
  target: ContextHookTarget,
  today: string,
  options: EntryHookOptions = {},
): string | null {
  const migrationLine =
    options.skipMigrationHook === true ? null : coldArchiveWarningLine(target, today)
  if (options.skipStreakHook !== true) rollQueueStreak(target.store, today)
  return migrationLine
}

export function withContext<T>(options: ContextOptions, run: (ctx: CommandContext) => T): T {
  const opened = openContext({
    dbPath: options.dbPath,
    exportDir: options.exportDir,
    deps: systemDeps,
    skipSchemaGate: options.skipSchemaGate,
    skipMigrationHook: options.skipMigrationHook,
    skipStreakHook: options.skipStreakHook,
  })
  const ctx: CommandContext = {
    dbPath: opened.dbPath,
    dbExisted: opened.dbExisted,
    deps: opened.deps,
    store: opened.store,
    interactive: process.stdin.isTTY === true && !options.json && !options.noInput,
    json: options.json,
    exportDir: opened.exportDir,
    close: opened.close,
  }

  try {
    const result = run(ctx)
    if (!options.skipStreakHook) rollQueueStreak(ctx.store, systemDeps.clock.todayLocalDate())
    writeMigrationWarning(opened.migrationLine)
    return result
  } catch (error) {
    if (!options.json) writeMigrationWarning(opened.migrationLine)
    throw error
  } finally {
    opened.close()
  }
}

function writeMigrationWarning(migrationLine: string | null): void {
  if (migrationLine === null) return
  process.stderr.write(`${migrationLine}\n`)
}

function openStoreOrCorrupt(dbPath: string, dbExisted: boolean): Store {
  try {
    return openStore(dbPath)
  } catch (error) {
    if (!dbExisted) throw error
    throw CliError.invalidState(`banco corrompido: ${dbPath}`)
  }
}

function coldArchiveWarningLine(target: ContextHookTarget, today: string): string | null {
  const result = migrateColdArchive({
    store: target.store,
    deps: target.deps,
    exportDir: target.exportDir,
    dbPath: target.dbPath,
    today,
  })
  if (result.exportPath === null) return null
  return result.exportError === null
    ? migratedLine(result.migrated, result.exportPath)
    : migrationFailedLine(result.exportPath)
}
