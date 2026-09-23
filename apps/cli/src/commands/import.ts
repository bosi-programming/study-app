import { assertAllowedFlags, assertPositionals } from '../args.ts'
import { applyDump, readDumpFile, validateReferences } from '../import.ts'
import { importedLine } from '../output/human.ts'
import { type Store } from '../persistence/index.ts'
import { type Command } from './types.ts'

export const importCommand: Command = (args, ctx) => {
  assertAllowedFlags(args, [], 'import')
  assertPositionals(args, 1, 1, 'import')

  const path = args.positionals[0] ?? ''
  const dump = readDumpFile(path)
  validateReferences(dump, localItemIds(ctx.store), path)
  const counts = applyDump(ctx.store, dump)

  return {
    json: { path, ...counts },
    human: importedLine(counts.items, counts.review_logs),
  }
}

function localItemIds(store: Store): ReadonlySet<string> {
  return new Set(store.listItems().map((item) => item.id))
}
