import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BrowserWindow, app, net, protocol } from 'electron'

const APP_SCHEME = 'study'
const APP_HOST = 'app'
const APP_ORIGIN = 'study://app'
const APP_ENTRY = `${APP_ORIGIN}/`
const DEFAULT_WEB_URL = 'http://localhost:4173'
const PACKAGED_WEB_DIR = 'web'
const WINDOW_WIDTH = 1024
const WINDOW_HEIGHT = 768

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

type WebSource =
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'bundle'; readonly dir: string }

const userData = process.env.STUDY_USER_DATA
if (userData !== undefined) {
  mkdirSync(userData, { recursive: true })
  app.setPath('userData', userData)
}

function webSource(): WebSource {
  const url = process.env.STUDY_WEB_URL
  if (url !== undefined && url.length > 0) return { kind: 'url', url }

  const dist = process.env.STUDY_WEB_DIST
  if (dist !== undefined && dist.length > 0) return { kind: 'bundle', dir: resolve(dist) }

  if (app.isPackaged) return { kind: 'bundle', dir: join(process.resourcesPath, PACKAGED_WEB_DIR) }

  return { kind: 'url', url: DEFAULT_WEB_URL }
}

function bundleTarget(root: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relative = decoded === '' || decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '')
  const target = resolve(root, relative)
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null
  return existsSync(target) ? target : null
}

function serveBundle(dir: string): void {
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url)
    const target = url.host === APP_HOST ? bundleTarget(dir, url.pathname) : null
    if (target === null) return new Response('não encontrado', { status: 404 })
    return net.fetch(pathToFileURL(target).toString())
  })
}

function assertBundle(dir: string): void {
  if (!existsSync(join(dir, 'index.html'))) {
    throw new Error(`bundle do web ausente em ${dir}: rode \`pnpm --filter @study/web build\``)
  }
}

function sourceUrl(source: WebSource): string {
  return source.kind === 'url' ? source.url : APP_ENTRY
}

async function createWindow(source: WebSource): Promise<void> {
  const window = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    webPreferences: {
      preload: join(import.meta.dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  window.once('ready-to-show', () => window.show())
  await window.loadURL(sourceUrl(source))
}

function reportFailure(cause: unknown): void {
  console.error(cause)
  app.exit(1)
}

void app
  .whenReady()
  .then(async () => {
    const source = webSource()
    if (source.kind === 'bundle') {
      assertBundle(source.dir)
      serveBundle(source.dir)
    }
    await createWindow(source)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow(source).catch(reportFailure)
    })
  })
  .catch(reportFailure)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
