import { errorPayload } from '../errors.ts'
import { envelope } from '../model/json.ts'
import { type CommandResult } from '../model/results.ts'
import { danger } from './color.ts'
import { render } from './render.ts'

export type PrintOptions = {
  readonly json: boolean
}

export function printSuccess(command: string, result: CommandResult, options: PrintOptions): void {
  const text = options.json ? JSON.stringify(envelope(command, result.json)) : render(result.view)
  process.stdout.write(`${text}\n`)
}

export function printError(error: unknown, options: PrintOptions): void {
  const payload = errorPayload(error)
  const text = options.json ? JSON.stringify(payload) : danger(payload.error.message)
  process.stderr.write(`${text}\n`)
}
