import { errorPayload } from '../errors.ts'
import { envelope } from './json.ts'

export type PrintOptions = {
  readonly json: boolean
}

export type PrintableResult = {
  readonly json: unknown
  readonly human: string
}

export function printSuccess(command: string, result: PrintableResult, options: PrintOptions): void {
  const text = options.json ? JSON.stringify(envelope(command, result.json)) : result.human
  process.stdout.write(`${text}\n`)
}

export function printError(error: unknown, options: PrintOptions): void {
  const payload = errorPayload(error)
  process.stderr.write(`${options.json ? JSON.stringify(payload) : payload.error.message}\n`)
}
