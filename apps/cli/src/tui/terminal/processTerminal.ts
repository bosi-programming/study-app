import { type TuiEvent, type TuiSize, type TuiTerminal } from '../loop/index.ts'

export function processTerminal(): TuiTerminal {
  const queue: TuiEvent[] = []
  let pending: ((event: TuiEvent | null) => void) | null = null
  let ended = false

  const deliver = (event: TuiEvent): void => {
    if (pending !== null) {
      const resolve = pending
      pending = null
      resolve(event)
      return
    }
    queue.push(event)
  }

  const onData = (chunk: Buffer | string): void => {
    deliver({ kind: 'key', chunk: typeof chunk === 'string' ? chunk : chunk.toString('utf8') })
  }

  const onResize = (): void => {
    deliver({ kind: 'resize', columns: process.stdout.columns ?? 0, rows: process.stdout.rows ?? 0 })
  }

  const onEnd = (): void => {
    ended = true
    if (pending !== null) {
      const resolve = pending
      pending = null
      resolve(null)
    }
  }

  const size = (): TuiSize => ({
    columns: process.stdout.columns ?? 0,
    rows: process.stdout.rows ?? 0,
  })

  process.stdin.setEncoding('utf8')
  process.stdin.on('data', onData)
  process.stdin.on('end', onEnd)
  process.stdout.on('resize', onResize)

  return {
    size,
    next: () =>
      new Promise<TuiEvent | null>((resolve) => {
        const queued = queue.shift()
        if (queued !== undefined) {
          resolve(queued)
          return
        }
        if (ended) {
          resolve(null)
          return
        }
        pending = resolve
      }),
    write: (frame) => {
      process.stdout.write(frame)
    },
    error: (message) => {
      process.stderr.write(`${message}\n`)
    },
  }
}
