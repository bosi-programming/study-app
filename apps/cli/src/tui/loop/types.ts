import { type Deps } from '@study/core'
import { type OpenContextOptions, type OpenedContext } from '../../context.ts'

export type TuiSize = {
  readonly columns: number
  readonly rows: number
}

export type TuiEvent =
  | { readonly kind: 'key'; readonly chunk: string }
  | { readonly kind: 'resize'; readonly columns: number; readonly rows: number }

export type TuiTerminal = {
  size(): TuiSize
  next(): Promise<TuiEvent | null>
  write(frame: string): void
  error(message: string): void
}

export type TuiOutcome = 'quit' | 'interrupt' | 'fatal'

export type TuiLocaleEnv = Readonly<Record<string, string | undefined>>

export type TuiOptions = {
  readonly dbPath: string | undefined
  readonly exportDir: string | undefined
  readonly deps: Deps
  readonly env: TuiLocaleEnv
  readonly color: boolean
  readonly terminal: TuiTerminal
  readonly open?: (options: OpenContextOptions) => OpenedContext
}
