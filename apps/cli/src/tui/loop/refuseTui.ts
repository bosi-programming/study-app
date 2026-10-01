import { CliError } from '../../errors.ts'

const TUI_REFUSAL_MESSAGE = 'a TUI exige um terminal interativo'

export type TuiRefusalInput = {
  readonly stdinTty: boolean
  readonly stdoutTty: boolean
  readonly noInput: boolean
  readonly json: boolean
}

export function refuseTui(input: TuiRefusalInput): CliError | null {
  if (input.stdinTty && input.stdoutTty && !input.noInput && !input.json) return null
  return CliError.usage(TUI_REFUSAL_MESSAGE)
}
