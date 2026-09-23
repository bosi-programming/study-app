import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const TMP_SUFFIX = '.tmp'

export function writeJsonAtomic(target: string, value: unknown): void {
  mkdirSync(dirname(target), { recursive: true })
  const temporary = `${target}${TMP_SUFFIX}`
  writeFileSync(temporary, JSON.stringify(value))
  renameSync(temporary, target)
}
