import { parseKeys, type KeyCommand, type KeyScreen } from '../keys.ts'

export type Peeled = {
  readonly commands: readonly KeyCommand[]
  readonly rest: string
}

export function peel(buffer: string, screen: KeyScreen): Peeled {
  const parsed = parseKeys(buffer, screen)
  const first = parsed.commands[0]
  if (first === undefined) return { commands: [], rest: parsed.pending }

  for (let length = 1; length <= buffer.length; length += 1) {
    const prefix = parseKeys(buffer.slice(0, length), screen)
    const candidate = prefix.commands[0]
    if (prefix.pending === '' && candidate !== undefined && sameCommand(candidate, first)) {
      return { commands: prefix.commands, rest: buffer.slice(length) }
    }
  }

  return { commands: [], rest: parsed.pending }
}

function sameCommand(a: KeyCommand, b: KeyCommand): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'reevaluate' && b.kind === 'reevaluate') return a.difficulty === b.difficulty
  return true
}
