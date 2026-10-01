import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { type ElectronApplication, type Page, _electron } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startWebServer, webUrl } from './web-server.ts'

const require = createRequire(import.meta.url)
const desktopDir = resolve(import.meta.dirname, '..')

let app: ElectronApplication
let page: Page
let stopWebServer: () => void

function electronBinary(): string {
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

function chromiumFlags(): string[] {
  return process.platform === 'linux' && process.env.CI !== undefined ? ['--no-sandbox'] : []
}

beforeAll(async () => {
  stopWebServer = await startWebServer()
  app = await _electron.launch({
    executablePath: electronBinary(),
    args: [...chromiumFlags(), desktopDir],
    env: { ...process.env, STUDY_WEB_URL: webUrl },
  })
  page = await app.firstWindow()
  await page.locator('h1').waitFor()
})

afterAll(async () => {
  await app?.close()
  stopWebServer?.()
})

describe('S-50 desktop-smoke', () => {
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
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => {
          const [window] = BrowserWindow.getAllWindows()
          return window?.isVisible() ?? false
        }),
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
