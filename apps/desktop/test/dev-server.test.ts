import { type ElectronApplication, type Page, _electron } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromiumFlags, desktopDir, desktopEnv, electronBinary } from './electron.ts'
import { startWebServer, webUrl } from './web-server.ts'

const smokePort = 4174

let app: ElectronApplication
let page: Page
let stopWebServer: () => void

beforeAll(async () => {
  stopWebServer = await startWebServer(smokePort)
  app = await _electron.launch({
    executablePath: electronBinary(),
    args: [...chromiumFlags(), desktopDir],
    env: desktopEnv({ STUDY_WEB_URL: webUrl(smokePort) }),
  })
  page = await app.firstWindow()
  await page.locator('h1').waitFor()
})

afterAll(async () => {
  await app?.close()
  stopWebServer?.()
})

describe('S-50 desktop-dev-server', () => {
  it('abre a janela com a raiz React do web renderizada', async () => {
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
