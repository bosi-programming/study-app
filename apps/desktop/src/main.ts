import { join } from 'node:path'
import { BrowserWindow, app } from 'electron'

const DEFAULT_WEB_URL = 'http://localhost:4173'
const WINDOW_WIDTH = 1024
const WINDOW_HEIGHT = 768

function webUrl(): string {
  return process.env.STUDY_WEB_URL ?? DEFAULT_WEB_URL
}

async function createWindow(): Promise<void> {
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
  await window.loadURL(webUrl())
}

function reportFailure(cause: unknown): void {
  console.error(cause)
  app.exit(1)
}

void app
  .whenReady()
  .then(async () => {
    await createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow().catch(reportFailure)
    })
  })
  .catch(reportFailure)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
