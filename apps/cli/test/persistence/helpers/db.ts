import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function withDb<T>(run: (dbPath: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'study-cli-test-'))
  const dbPath = join(dir, 'study.db')
  try {
    return run(dbPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function withNestedDb<T>(run: (dbPath: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'study-cli-test-'))
  const dbPath = join(dir, 'a', 'b', 'study.db')
  try {
    return run(dbPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}