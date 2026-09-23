import { existsSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertAllowedFlags, assertPositionals, hasFlag } from '../args.ts'
import { CliError } from '../errors.ts'
import { writeJsonAtomic } from '../output/file.ts'
import { exportedLine } from '../output/human.ts'
import { dumpJsonV1 } from '../output/json.ts'
import { type Command } from './types.ts'

export const exportCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, ['yes'], 'export')
  assertPositionals(args, 1, 1, 'export')

  const path = args.positionals[0] ?? ''
  if (realPathOf(path) === realPathOf(ctx.dbPath)) {
    throw CliError.invalidState(`arquivo de export é o banco: ${path}`)
  }
  if (existsSync(path) && !hasFlag(args, 'yes')) {
    throw CliError.usage('arquivo já existe; use --yes para sobrescrever')
  }

  const dump = dumpJsonV1(ctx.store, ctx.deps)
  writeJsonAtomic(path, dump)

  return {
    json: {
      path,
      items: dump.items.length,
      review_logs: dump.review_logs.length,
      cold_archive: dump.cold_archive.length,
    },
    human: exportedLine(path),
  }
}

function realPathOf(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}
