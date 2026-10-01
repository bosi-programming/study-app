import { type ChildProcess, spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const webPort = 4173
const startTimeoutMs = 30_000
const pollIntervalMs = 100

export const webUrl = `http://localhost:${webPort}`

function portIsOpen(): Promise<boolean> {
  return new Promise((settle) => {
    const socket = createConnection({ host: 'localhost', port: webPort })
    socket.once('connect', () => {
      socket.destroy()
      settle(true)
    })
    socket.once('error', () => {
      socket.destroy()
      settle(false)
    })
  })
}

function delay(ms: number): Promise<void> {
  return new Promise((settle) => setTimeout(settle, ms))
}

async function waitUntilListening(child: ChildProcess, output: string[]): Promise<void> {
  const deadline = Date.now() + startTimeoutMs

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`dev server do web saiu com código ${child.exitCode}:\n${output.join('')}`)
    }
    if (await portIsOpen()) return
    await delay(pollIntervalMs)
  }

  throw new Error(`dev server do web não abriu a porta ${webPort}:\n${output.join('')}`)
}

function stop(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

export async function startWebServer(): Promise<() => void> {
  if (await portIsOpen()) {
    throw new Error(`a porta ${webPort} já está ocupada: pare o processo que a usa antes do smoke`)
  }

  const child = spawn('pnpm', ['--filter', '@study/web', 'dev'], {
    cwd: root,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const output: string[] = []
  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')
  child.stdout?.on('data', (chunk: string) => output.push(chunk))
  child.stderr?.on('data', (chunk: string) => output.push(chunk))

  await waitUntilListening(child, output)
  return () => stop(child)
}
