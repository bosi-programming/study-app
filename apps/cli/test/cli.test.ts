import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(import.meta.dirname, '../../..')
const binPath = resolve(repoRoot, 'node_modules/.bin/study')

function runStudy(cwd: string) {
  return spawnSync(binPath, [], { cwd, encoding: 'utf8' })
}

describe('T-06 cli bin runs', () => {
  it('links the study bin into the repo', () => {
    expect(existsSync(binPath)).toBe(true)
  })

  it('prints the core banner and exits 0', () => {
    const result = runStudy(repoRoot)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('study (core 0.0.0)')
  })
})

describe('T-07 cli bin outside the repo', () => {
  it('still runs from an unrelated cwd', () => {
    const result = runStudy('/tmp')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('study (core 0.0.0)')
  })
})
