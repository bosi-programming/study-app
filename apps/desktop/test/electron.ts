import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)

export const desktopDir = resolve(import.meta.dirname, '..')
export const rootDir = resolve(desktopDir, '../..')

type Env = Record<string, string>

export function electronBinary(): string {
  try {
    const binary: unknown = require('electron')
    if (typeof binary !== 'string') throw new Error('o pacote electron não devolveu o caminho do binário')
    return binary
  } catch (cause) {
    throw new Error(
      'Binário do Electron ausente: rode `pnpm install` com o `allowBuilds` do pnpm-workspace.yaml liberando o download.',
      { cause },
    )
  }
}

export function chromiumFlags(): string[] {
  return process.platform === 'linux' && process.env.CI !== undefined ? ['--no-sandbox'] : []
}

export function desktopEnv(overrides: Env): Env {
  const env: Env = {}
  const controlled = ['STUDY_WEB_URL', 'STUDY_WEB_DIST', 'STUDY_USER_DATA']
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !controlled.includes(key)) env[key] = value
  }
  return { ...env, ...overrides }
}
