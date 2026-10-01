import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron } from 'playwright-core'
import { describe, expect, it, onTestFinished } from 'vitest'
import { webVersion } from '../scripts/version.ts'

const dist = process.env.STUDY_PACKAGED_APP
const rootDir = resolve(import.meta.dirname, '../../..')

type IdbEnvironmentHandle = { readonly factory: unknown; readonly keyRange: unknown }
type StudyStoreGlobal = {
  studyStore: {
    openStore(environment: IdbEnvironmentHandle, name?: string): Promise<{
      schemaVersion(): Promise<number | null>
      close(): void
    }>
    browserIdb(): IdbEnvironmentHandle
  }
}

function packagedExecutable(distDir: string): string {
  if (process.platform === 'darwin') {
    const macDir = readdirSync(distDir).find((name) => name.startsWith('mac'))
    if (macDir === undefined) throw new Error(`diretório mac ausente em ${distDir}`)
    const macOsDir = join(distDir, macDir, 'Study.app', 'Contents', 'MacOS')
    const binary = readdirSync(macOsDir)[0]
    if (binary === undefined) throw new Error(`binário ausente em ${macOsDir}`)
    return join(macOsDir, binary)
  }
  if (process.platform === 'win32') return join(distDir, 'win-unpacked', 'Study.exe')
  const unpacked = join(distDir, 'linux-unpacked')
  const binary = readdirSync(unpacked).find((name) => name === 'Study' || name === 'study')
  if (binary === undefined) throw new Error(`binário ausente em ${unpacked}`)
  return join(unpacked, binary)
}

describe.runIf(dist !== undefined)('S-56..S-61 desktop-app-empacotado', () => {
  it('abre em study://app, mostra a fila do dia e sai com a versão do web', async () => {
    if (dist === undefined) throw new Error('STUDY_PACKAGED_APP ausente')
    const userData = mkdtempSync(join(tmpdir(), 'study-packaged-'))
    const app = await _electron.launch({
      executablePath: packagedExecutable(resolve(rootDir, dist)),
      env: { ...process.env, STUDY_USER_DATA: userData },
    })
    onTestFinished(async () => {
      await app.close().catch(() => undefined)
      rmSync(userData, { recursive: true, force: true })
    })

    const version = await app.evaluate(({ app: electronApp }) => electronApp.getVersion())
    const page = await app.firstWindow()
    await page.locator('h1').waitFor()

    const origin = await page.evaluate(
      () => (globalThis as unknown as { location: { origin: string } }).location.origin,
    )
    const queue = await page.locator('p').first().textContent()
    const schemaVersion = await page.evaluate(async () => {
      const scope = globalThis as unknown as StudyStoreGlobal
      const store = await scope.studyStore.openStore(scope.studyStore.browserIdb())
      const version = await store.schemaVersion()
      store.close()
      return version
    })

    expect(version).toBe(webVersion(rootDir))
    expect(origin).toBe('study://app')
    expect(queue).toContain('Próxima revisão em')
    expect(schemaVersion).toBe(1)
  })
})
