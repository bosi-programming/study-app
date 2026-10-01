import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type ElectronApplication, type Page, _electron } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it, onTestFinished } from 'vitest'
import { chromiumFlags, desktopDir, desktopEnv, electronBinary, rootDir } from './electron.ts'

const APP_ORIGIN = 'study://app'
const WEB_DIST = join(rootDir, 'apps/web/dist')
const PERSISTED_ITEM = {
  id: '6f2a1c3d-4e5b-4a7c-8d9e-0f1a2b3c4d5e',
  title: 'Item que sobrevive ao fechar',
  subject: 'Cálculo',
  difficulty: 3,
  note: null,
  link: null,
  interval_days: 3,
  due_date: '2026-10-05',
  review_count: 0,
  on_time_streak: 0,
  status: 'active',
  last_reviewed_at: null,
  archived_at: null,
  cold_archived_at: null,
  created_at: '2026-10-01T09:00:00Z',
  updated_at: '2026-10-01T09:00:00Z',
} as const

type IdbEnvironmentHandle = { readonly factory: unknown; readonly keyRange: unknown }

type StoreHandle = {
  schemaVersion(): Promise<number | null>
  saveItem(item: unknown): Promise<void>
  listItems(): Promise<{ readonly title: string }[]>
  setMeta(key: string, value: string): Promise<void>
  close(): void
}

type StudyStoreGlobal = {
  studyStore: {
    openStore(environment: IdbEnvironmentHandle, name?: string): Promise<StoreHandle>
    browserIdb(): IdbEnvironmentHandle
  }
}

type IdbObjectStoreNames = { readonly length: number; item(index: number): string | null }
type IdbDatabaseHandle = { readonly objectStoreNames: IdbObjectStoreNames; close(): void }
type IdbTransactionHandle = { db: { createObjectStore(name: string): unknown } }
type IdbRequestHandle = {
  onsuccess: (() => void) | null
  onerror: (() => void) | null
  onupgradeneeded: (() => void) | null
  result: IdbDatabaseHandle
  error: unknown
  transaction: IdbTransactionHandle | null
}
type IdbFactoryHandle = { open(name: string, version?: number): IdbRequestHandle }

let app: ElectronApplication
let page: Page
let studyUserData = ''

async function launchDesktop(env: Record<string, string>): Promise<ElectronApplication> {
  return _electron.launch({
    executablePath: electronBinary(),
    args: [...chromiumFlags(), desktopDir],
    env,
  })
}

function runToExit(child: ChildProcess): Promise<{ code: number | null; stderr: string }> {
  const chunks: string[] = []
  child.stderr?.setEncoding('utf8')
  child.stderr?.on('data', (chunk: string) => chunks.push(chunk))
  return new Promise((resolve) => {
    child.once('exit', (code) => resolve({ code, stderr: chunks.join('') }))
  })
}

async function readOrigin(target: Page): Promise<string> {
  return target.evaluate(
    () => (globalThis as unknown as { location: { origin: string } }).location.origin,
  )
}

async function readSchemaSnapshot(target: Page): Promise<{ stores: string[]; version: number | null }> {
  return target.evaluate(async () => {
    const scope = globalThis as unknown as StudyStoreGlobal
    const store = await scope.studyStore.openStore(scope.studyStore.browserIdb())
    const version = await store.schemaVersion()
    store.close()
    const factory = (globalThis as unknown as { indexedDB: IdbFactoryHandle }).indexedDB
    const request = factory.open('study')
    const db = await new Promise<IdbDatabaseHandle>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const stores: string[] = []
    for (let index = 0; index < db.objectStoreNames.length; index += 1) {
      const name = db.objectStoreNames.item(index)
      if (name !== null) stores.push(name)
    }
    db.close()
    return { stores: stores.toSorted(), version }
  })
}

async function createDivergentDatabase(target: Page, name: string): Promise<void> {
  await target.evaluate(async (dbName) => {
    const factory = (globalThis as unknown as { indexedDB: IdbFactoryHandle }).indexedDB
    const request = factory.open(dbName, 1)
    await new Promise<void>((resolve, reject) => {
      request.onupgradeneeded = () => {
        request.transaction?.db.createObjectStore('divergente')
      }
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }, name)
}

async function schemaErrorName(target: Page, name: string): Promise<string> {
  return target.evaluate(async (dbName) => {
    const scope = globalThis as unknown as StudyStoreGlobal
    try {
      await scope.studyStore.openStore(scope.studyStore.browserIdb(), dbName)
      return 'sem erro'
    } catch (error) {
      return (error as { name?: string }).name ?? 'erro sem nome'
    }
  }, name)
}

async function saveItem(target: Page, item: unknown): Promise<void> {
  await target.evaluate(async (payload) => {
    const scope = globalThis as unknown as StudyStoreGlobal
    const store = await scope.studyStore.openStore(scope.studyStore.browserIdb())
    await store.saveItem(payload)
    store.close()
  }, item)
}

async function listTitles(target: Page): Promise<string[]> {
  return target.evaluate(async () => {
    const scope = globalThis as unknown as StudyStoreGlobal
    const store = await scope.studyStore.openStore(scope.studyStore.browserIdb())
    const items = await store.listItems()
    store.close()
    return items.map((item) => item.title)
  })
}

beforeAll(async () => {
  const build = spawnSync('pnpm', ['--filter', '@study/web', 'build'], {
    cwd: rootDir,
    encoding: 'utf8',
  })
  expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0)
  studyUserData = mkdtempSync(join(tmpdir(), 'study-smoke-'))
  app = await launchDesktop(desktopEnv({ STUDY_WEB_DIST: WEB_DIST, STUDY_USER_DATA: studyUserData }))
  page = await app.firstWindow()
  await page.locator('h1').waitFor()
})

afterAll(async () => {
  await app?.close()
  if (studyUserData.length > 0) rmSync(studyUserData, { recursive: true, force: true })
})

describe('AC1 desktop-bundle-build', () => {
  it('build do web gera o index.html e os assets que o Electron carrega', () => {
    expect(existsSync(join(WEB_DIST, 'index.html'))).toBe(true)
    expect(readdirSync(join(WEB_DIST, 'assets')).length).toBeGreaterThan(0)
  })
})

describe('AC2 desktop-bundle-render', () => {
  it('mostra a raiz React do web renderizada', async () => {
    await expect(page.locator('h1').textContent()).resolves.toBe('Study')
  })

  it('mostra o texto que vem do core', async () => {
    await expect(page.locator('main').innerText()).resolves.toContain('Próxima revisão em')
  })

  it('expõe a ponte do preload no renderer', async () => {
    const bridge = await page.evaluate(
      () =>
        (globalThis as unknown as { studyDesktop?: { platform?: unknown; electron?: unknown } })
          .studyDesktop,
    )

    expect(bridge?.platform).toBe(process.platform)
    expect(typeof bridge?.electron).toBe('string')
  })

  it('mostra a janela criada quando o renderer fica pronto', async () => {
    await expect
      .poll(
        () =>
          app.evaluate(({ BrowserWindow }) => {
            const [window] = BrowserWindow.getAllWindows()
            return window?.isVisible() ?? false
          }),
        { timeout: 15_000, interval: 100 },
      )
      .toBe(true)
  })

  it('mantém o nodeIntegration desligado no renderer', async () => {
    const rendererRequire = await page.evaluate(
      () => typeof (globalThis as unknown as { require?: unknown }).require,
    )

    expect(rendererRequire).toBe('undefined')
  })

  it('aplica isolamento de contexto e sandbox na janela real', async () => {
    const preferences = await app.evaluate(({ BrowserWindow }) => {
      const [window] = BrowserWindow.getAllWindows()
      if (window === undefined) return null
      const contents = window.webContents as unknown as {
        getLastWebPreferences?: () => Record<string, unknown>
      }
      return contents.getLastWebPreferences?.() ?? null
    })

    expect(preferences).toMatchObject({
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    })
  })
})

describe('AC3 desktop-bundle-store', () => {
  it('abre o renderer sob a origem fixada pelo ADR, sem dev server', async () => {
    await expect(readOrigin(page)).resolves.toBe(APP_ORIGIN)
  })

  it('openStore cria os quatro stores com schema_version = 1 sob a origem nova', async () => {
    const snapshot = await readSchemaSnapshot(page)

    expect(snapshot.stores).toEqual(['cold_archive', 'items', 'meta', 'review_logs'])
    expect(snapshot.version).toBe(1)
  })

  it('rejeita banco divergente com SchemaMismatchError', async () => {
    await createDivergentDatabase(page, 'study-divergente')

    await expect(schemaErrorName(page, 'study-divergente')).resolves.toBe('SchemaMismatchError')
  })

  it('rejeita banco divergente com SchemaVersionError', async () => {
    const name = 'study-versao-divergente'
    const version = await page.evaluate(async (dbName) => {
      const scope = globalThis as unknown as StudyStoreGlobal
      const store = await scope.studyStore.openStore(scope.studyStore.browserIdb(), dbName)
      await store.setMeta('schema_version', '9')
      store.close()
      try {
        await scope.studyStore.openStore(scope.studyStore.browserIdb(), dbName)
        return 'sem erro'
      } catch (error) {
        return (error as { name?: string }).name ?? 'erro sem nome'
      }
    }, name)

    expect(version).toBe('SchemaVersionError')
  })
})

describe('AC4 desktop-bundle-persistence', () => {
  it(
    'mantém o item criado depois de fechar e reabrir o app',
    { timeout: 110_000 },
    async () => {
      const userData = mkdtempSync(join(tmpdir(), 'study-persist-'))
      const env = desktopEnv({ STUDY_WEB_DIST: WEB_DIST, STUDY_USER_DATA: userData })

      const first = await launchDesktop(env)
      onTestFinished(async () => {
        await first.close().catch(() => undefined)
      })
      const firstPage = await first.firstWindow()
      await firstPage.locator('h1').waitFor()
      await saveItem(firstPage, PERSISTED_ITEM)
      await first.close()

      const second = await launchDesktop(env)
      onTestFinished(async () => {
        await second.close().catch(() => undefined)
      })
      const secondPage = await second.firstWindow()
      await secondPage.locator('h1').waitFor()
      const titles = await listTitles(secondPage)
      await second.close()

      expect(titles).toEqual([PERSISTED_ITEM.title])
      onTestFinished(() => rmSync(userData, { recursive: true, force: true }))
    },
  )

  it('dirige o userData do Electron pelo STUDY_USER_DATA temporário', async () => {
    const dir = await app.evaluate(({ app: electronApp }) => electronApp.getPath('userData'))

    expect(realpathSync(dir)).toBe(realpathSync(studyUserData))
  })
})

describe('AC6 desktop-bundle-falha', () => {
  it('falha alto quando o bundle apontado não existe', { timeout: 30_000 }, async () => {
    const missing = join(tmpdir(), 'study-bundle-ausente')
    const child = spawn(electronBinary(), [...chromiumFlags(), desktopDir], {
      env: desktopEnv({ STUDY_WEB_DIST: missing }),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    onTestFinished(() => {
      child.kill('SIGKILL')
    })

    const { code, stderr } = await runToExit(child)

    expect(code).toBe(1)
    expect(stderr).toContain('bundle do web ausente')
  })

  it('sai com erro quando o STUDY_WEB_URL não responde', { timeout: 30_000 }, async () => {
    const child = spawn(electronBinary(), [...chromiumFlags(), desktopDir], {
      env: desktopEnv({ STUDY_WEB_URL: 'http://127.0.0.1:9' }),
      stdio: 'ignore',
    })
    onTestFinished(() => {
      child.kill('SIGKILL')
    })

    const { code } = await runToExit(child)

    expect(code).toBe(1)
  })
})
