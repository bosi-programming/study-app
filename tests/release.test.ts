import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const releasePath = '.github/workflows/release.yml'

function sourceAt(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function trackedFiles(): string[] {
  const result = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  return result.stdout.split('\n').filter((line) => line.length > 0)
}

const secretNames = [
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'GPG_PRIVATE_KEY',
  'GPG_KEY_ID',
  'GPG_PASSPHRASE',
]

describe('S-59 desktop-workflow-de-release', () => {
  const workflow = sourceAt(releasePath)

  it('dispara por tag e por workflow_dispatch', () => {
    expect(workflow).toMatch(/tags:\s*\n\s*-\s*'v\*'/)
    expect(workflow).toContain('workflow_dispatch:')
  })

  it('roda o empacotamento nos três runners nativos', () => {
    for (const runner of ['macos-latest', 'windows-latest', 'ubuntu-latest']) {
      expect(workflow, runner).toContain(runner)
    }
    expect(workflow).toContain('pnpm --filter @study/desktop package')
  })

  it('sobe um artefato por perna', () => {
    expect(workflow).toContain('actions/upload-artifact')
    expect(workflow).toContain('apps/desktop/dist')
  })

  it('assina o AppImage numa perna Linux dedicada', () => {
    expect(workflow).toContain('pnpm --filter @study/desktop sign:appimage')
  })

  it('cria release draft só no gatilho de tag', () => {
    expect(workflow).toContain('draft: true')
    expect(workflow).toMatch(/if:\s*startsWith\(github\.ref,\s*'refs\/tags\/'\)/)
  })

  it('instala com lockfile congelado', () => {
    expect(workflow).toContain('pnpm install --frozen-lockfile')
  })
})

describe('S-60 desktop-sem-segredos', () => {
  it('não versiona arquivo de certificado, chave ou gpg', () => {
    const forbidden = new Set(['.p12', '.pfx', '.pem', '.key', '.gpg', '.p8'])
    const offenders = trackedFiles().filter((file) => forbidden.has(extname(file)))

    expect(offenders).toEqual([])
  })

  it('não carrega material de chave nem base64 longo em scripts e configs', () => {
    const files = [
      releasePath,
      'apps/desktop/electron-builder.yml',
      ...readdirSync(resolve(root, 'apps/desktop/scripts')).map((name) => `apps/desktop/scripts/${name}`),
    ]

    for (const file of files) {
      const source = sourceAt(file)
      expect(source, file).not.toMatch(/-----BEGIN [A-Z ]*(PRIVATE KEY|CERTIFICATE)-----/)
      expect(source, file).not.toMatch(/[A-Za-z0-9+/]{200,}={0,2}/)
    }
  })

  it('tira todo segredo de assinatura de secrets.* no workflow', () => {
    const workflow = sourceAt(releasePath)

    for (const name of secretNames) {
      expect(workflow, name).toContain(`secrets.${name}`)
    }
  })

  it('mantém o CI de PR sem segredo nenhum', () => {
    expect(sourceAt('.github/workflows/ci.yml')).not.toContain('secrets.')
  })

  it('limita o bundle do pacote a src e ao manifesto', () => {
    const config = sourceAt('apps/desktop/electron-builder.yml')
    const section = config.split('\n')
    const start = section.findIndex((line) => line.trimEnd() === 'files:')
    const entries: string[] = []
    for (const line of section.slice(start + 1)) {
      if (line.trim().length > 0 && !/^\s/.test(line)) break
      const match = /^\s*-\s*(\S+)\s*$/.exec(line)
      if (match?.[1] !== undefined) entries.push(match[1])
    }

    expect(entries).toEqual(['src/**', 'package.json'])
  })
})
