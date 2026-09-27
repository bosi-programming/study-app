import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveDbPath } from '../src/context.ts'

describe('context — caminho do banco', () => {
  it('db-padrao-darwin: sem --db e sem STUDY_DB, o macOS usa Application Support', () => {
    expect(resolveDbPath(undefined, {}, 'darwin')).toBe(
      join(homedir(), 'Library', 'Application Support', 'study-app', 'study.db'),
    )
  })

  it('db-precedencia: --db vence STUDY_DB, que vence o padrão por plataforma', () => {
    const env = { STUDY_DB: '/tmp/env.db', XDG_DATA_HOME: '/tmp/xdg' }

    expect(resolveDbPath('/tmp/explicit.db', env, 'linux')).toBe('/tmp/explicit.db')
    expect(resolveDbPath(undefined, env, 'linux')).toBe('/tmp/env.db')
    expect(resolveDbPath(undefined, { XDG_DATA_HOME: '/tmp/xdg' }, 'linux')).toBe(
      '/tmp/xdg/study-app/study.db',
    )
  })
})
