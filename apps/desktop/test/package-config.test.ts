import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { builderArgs, packageVersion } from '../scripts/builder.ts'
import { shellFor } from '../scripts/run.ts'
import { assertSigningReady, signingPlan } from '../scripts/signing.ts'
import { assertReleasableVersion, desktopVersion, webVersion } from '../scripts/version.ts'

const desktopDir = resolve(import.meta.dirname, '..')
const rootDir = resolve(desktopDir, '../..')

function sourceAt(relativePath: string): string {
  return readFileSync(resolve(rootDir, relativePath), 'utf8')
}

describe('S-57 desktop-versao-fonte-unica', () => {
  it('mantém a versão do desktop em paridade com a do web', () => {
    expect(desktopVersion(rootDir)).toBe(webVersion(rootDir))
  })

  it('recusa 0.0.0 como versão de release', () => {
    expect(() => assertReleasableVersion('0.0.0')).toThrow(/0\.0\.0/)
  })

  it('recusa qualquer coisa fora de semver', () => {
    for (const invalid of ['1.2', 'v1.2.3', '1.2.3.4', 'abc', '1.2.x']) {
      expect(() => assertReleasableVersion(invalid), invalid).toThrow(/semver/)
    }
  })

  it('aceita uma versão semver com pre-release e build', () => {
    expect(assertReleasableVersion('1.2.3-beta.1+build.9')).toBe('1.2.3-beta.1+build.9')
  })

  it('injeta no pacote a versão do web, não um número próprio', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'study-web-version-'))

    try {
      mkdirSync(join(fixture, 'apps/web'), { recursive: true })
      writeFileSync(join(fixture, 'apps/web/package.json'), '{"version":"1.2.3"}')

      const version = packageVersion(fixture)

      expect(version).toBe('1.2.3')
      expect(builderArgs(version)).toContain('--config.extraMetadata.version=1.2.3')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

describe('S-58 desktop-plano-de-assinatura', () => {
  it('exige os segredos de assinatura e notarização do macOS', () => {
    const plan = signingPlan('darwin', {})
    const missing = plan.targets.flatMap((target) => target.missing)

    expect(missing).toEqual(
      expect.arrayContaining([
        'CSC_LINK',
        'CSC_KEY_PASSWORD',
        'APPLE_ID',
        'APPLE_APP_SPECIFIC_PASSWORD',
        'APPLE_TEAM_ID',
      ]),
    )
  })

  it('exige os segredos do signtool no Windows', () => {
    const plan = signingPlan('win32', {})

    expect(plan.targets[0]?.tool).toBe('signtool')
    expect(plan.missing).toEqual(['CSC_LINK', 'CSC_KEY_PASSWORD'])
  })

  it('exige a chave GPG destacada no Linux', () => {
    const plan = signingPlan('linux', {})

    expect(plan.targets[0]?.artifact).toBe('AppImage')
    expect(plan.missing).toEqual(['GPG_PRIVATE_KEY', 'GPG_KEY_ID', 'GPG_PASSPHRASE'])
  })

  it('marca o plano como assinado quando todos os segredos estão no ambiente', () => {
    const plan = signingPlan('linux', {
      GPG_PRIVATE_KEY: 'chave',
      GPG_KEY_ID: 'id',
      GPG_PASSPHRASE: 'senha',
    })

    expect(plan.signed).toBe(true)
    expect(plan.missing).toEqual([])
  })

  it('lança alto num build de release sem os segredos, listando o que falta', () => {
    const plan = signingPlan('darwin', {})

    expect(() => assertSigningReady(plan, { release: true })).toThrow(/CSC_LINK/)
  })

  it('não lança fora de release e devolve o plano como não assinado', () => {
    const plan = assertSigningReady(signingPlan('win32', {}), { release: false })

    expect(plan.signed).toBe(false)
    expect(plan.missing).toEqual(['CSC_LINK', 'CSC_KEY_PASSWORD'])
  })

  it('assina o AppImage com GPG destacado e saída .AppImage.sig', () => {
    const source = sourceAt('apps/desktop/scripts/sign-appimage.ts')

    expect(source).toContain('--batch')
    expect(source).toContain('--pinentry-mode')
    expect(source).toContain('--detach-sign')
    expect(source).toContain('.sig')
    expect(source).toContain('GPG_KEY_ID')
    expect(source).toContain('GPG_PASSPHRASE')
  })

  it('satisfaz o plano de assinatura com os segredos do passo Package do workflow', () => {
    const env = stepEnv(sourceAt('.github/workflows/release.yml'), 'Package')

    for (const platform of ['darwin', 'win32', 'linux'] as const) {
      expect(signingPlan(platform, env).missing, platform).toEqual([])
    }
  })
})

function stepEnv(source: string, stepName: string): Record<string, string> {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.trim() === `- name: ${stepName}`)
  if (start < 0) return {}

  const env: Record<string, string> = {}
  for (const line of lines.slice(start + 1)) {
    if (/^\s*-\s/.test(line)) break
    const match = /^\s+([A-Z_]+):\s*\$\{\{\s*secrets\.[A-Z_]+\s*\}\}\s*$/.exec(line)
    if (match?.[1] !== undefined) env[match[1]] = 'set'
  }
  return env
}

function yamlSection(source: string, key: string): string[] {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => line.trimEnd() === `${key}:`)
  if (start < 0) return []
  const section: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim().length > 0 && !/^\s/.test(line)) break
    section.push(line)
  }
  return section
}

function targetList(source: string, platform: string): string[] {
  const section = yamlSection(source, platform)
  const start = section.findIndex((line) => line.trim() === 'target:')
  if (start < 0) return []
  const targets: string[] = []
  for (const line of section.slice(start + 1)) {
    const match = /^\s*-\s*(\S+)\s*$/.exec(line)
    if (match === null || match[1] === undefined) break
    targets.push(match[1])
  }
  return targets
}

describe('S-56 desktop-config-do-pacote', () => {
  const config = sourceAt('apps/desktop/electron-builder.yml')
  const entitlements = sourceAt('apps/desktop/build/entitlements.mac.plist')

  it('declara exatamente os três instaladores', () => {
    expect(targetList(config, 'mac')).toEqual(['dmg'])
    expect(targetList(config, 'win')).toEqual(['nsis'])
    expect(targetList(config, 'linux')).toEqual(['AppImage'])

    for (const other of ['msi', 'deb', 'rpm', 'zip', 'pkg', 'snap', 'flatpak']) {
      expect(config, other).not.toMatch(new RegExp(`-\\s+${other}\\b`))
    }
  })

  it('leva o bundle do web para resourcesPath/web', () => {
    expect(config).toContain('from: ../web/dist')
    expect(config).toContain('to: web')
  })

  it('limita o pacote a src e ao manifesto, dentro do asar', () => {
    expect(yamlSection(config, 'files').join('\n')).toContain('src/**')
    expect(yamlSection(config, 'files').join('\n')).toContain('package.json')
    expect(config).toContain('asar: true')
  })

  it('endurece a assinatura e a notarização do macOS', () => {
    const section = yamlSection(config, 'mac').join('\n')

    expect(section).toContain('hardenedRuntime: true')
    expect(section).toContain('gatekeeperAssess: false')
    expect(section).toContain('notarize: true')
    expect(section).toContain('entitlements')
    expect(entitlements).toContain('com.apple.security.cs.allow-jit')
    expect(entitlements).toContain('com.apple.security.network.client')
  })

  it('instala o NSIS de forma assistida e por usuário', () => {
    const section = yamlSection(config, 'nsis').join('\n')

    expect(section).toContain('oneClick: false')
    expect(section).toContain('perMachine: false')
    expect(section).toContain('allowToChangeInstallationDirectory: true')
  })
})

describe('S-56 desktop-scripts-de-pacote', () => {
  const manifest = JSON.parse(sourceAt('apps/desktop/package.json')) as {
    readonly scripts?: Record<string, string>
    readonly devDependencies?: Record<string, string>
    readonly build?: unknown
    readonly files?: unknown
  }

  it('expõe os scripts package e sign:appimage', () => {
    expect(manifest.scripts?.package).toBe('node scripts/package.ts')
    expect(manifest.scripts?.['sign:appimage']).toBe('node scripts/sign-appimage.ts')
  })

  it('pina o electron-builder no manifesto e no lockfile', () => {
    const version = manifest.devDependencies?.['electron-builder']
    expect(version).toBeDefined()
    expect(sourceAt('pnpm-lock.yaml')).toContain(`electron-builder@${version}`)
  })

  it('mantém a config fora do manifesto, como o S-44 exige', () => {
    expect(manifest).not.toHaveProperty('build')
    expect(manifest).not.toHaveProperty('files')
  })

  it('chama o pnpm pelo shell do Windows, que não executa .cmd direto', () => {
    const source = sourceAt('apps/desktop/scripts/package.ts')

    expect(source).toContain("run('pnpm'")
    expect(source).not.toContain('pnpm.cmd')
    expect(shellFor('win32')).toBe(true)
    expect(shellFor('darwin')).toBe(false)
    expect(shellFor('linux')).toBe(false)
  })
})
