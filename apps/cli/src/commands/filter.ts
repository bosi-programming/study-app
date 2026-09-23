import { normalizeText, type ItemStatus } from '@study/core'
import { valueOf } from '../args.ts'
import { CliError } from '../errors.ts'
import { type ItemFilter } from '../persistence/index.ts'
import { type CommandArgs } from './types.ts'

const DEFAULT_STATUS: ItemStatus = 'active'

export function itemFilter(args: CommandArgs): ItemFilter {
  const status = parseStatus(valueOf(args, 'status'))
  const subject = valueOf(args, 'subject')
  if (subject === undefined) return { status }
  return { status, subjectKey: normalizeText(subject) }
}

function parseStatus(value: string | undefined): ItemStatus {
  if (value === undefined) return DEFAULT_STATUS
  if (value === 'active' || value === 'archived' || value === 'cold') return value
  throw CliError.invalidStatus()
}
