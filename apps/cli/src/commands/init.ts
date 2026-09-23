import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { assertAllowedFlags, assertPositionals, hasFlag } from '../args.ts'
import { CliError } from '../errors.ts'
import { createdDbLine, resetDbLine } from '../output/human.ts'
import { dumpJsonV1 } from '../output/json.ts'
import { openStore } from '../persistence/index.ts'
import { type Command } from './types.ts'

const BACKUP_DIR = 'backups'
const BACKUP_PREFIX = 'pre-reset-'
const TMP_SUFFIX = '.tmp'
const DB_SUFFIXES = ['', '-wal', '-shm']

export const initCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['reset', 'yes'], 'init')
  assertPositionals(args, 0, 0, 'init')

  if (!ctx.dbExisted) {
    return {
      json: { action: 'created', db_path: ctx.dbPath },
      human: createdDbLine(ctx.dbPath),
    }
  }

  if (!hasFlag(args, 'reset') || !hasFlag(args, 'yes')) {
    throw CliError.usage('init com banco existente exige --reset --yes')
  }

  const dump = JSON.stringify(dumpJsonV1(ctx.store, ctx.deps))
  const backupPath = writeBackup(ctx.dbPath, dump, ctx.deps.clock.nowUtc())
  ctx.close()
  removeDbFiles(ctx.dbPath)
  openStore(ctx.dbPath).close()

  return {
    json: { action: 'reset', db_path: ctx.dbPath, backup_path: backupPath },
    human: resetDbLine(ctx.dbPath, backupPath),
  }
}

function writeBackup(dbPath: string, contents: string, nowUtc: string): string {
  const target = join(dirname(dbPath), BACKUP_DIR, `${BACKUP_PREFIX}${backupStamp(nowUtc)}.json`)
  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(`${target}${TMP_SUFFIX}`, contents)
    renameSync(`${target}${TMP_SUFFIX}`, target)
  } catch {
    throw CliError.backupFailed()
  }
  return target
}

function backupStamp(nowUtc: string): string {
  return nowUtc.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function removeDbFiles(dbPath: string): void {
  for (const suffix of DB_SUFFIXES) rmSync(`${dbPath}${suffix}`, { force: true })
}
