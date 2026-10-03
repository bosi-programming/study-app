import { boxOptions } from './boxOptions.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import type { RenderState } from './types.ts'

const CONFIRM_TITLE = 'Confirmação'
const CONFIRM_HINT = 'y confirma · n/Esc cancela'

export function renderConfirm(state: RenderState): string[] {
  const options = boxOptions(state)
  const confirm = state.confirm
  if (confirm === null) return renderBox(CONFIRM_TITLE, [], options)

  return renderBox(CONFIRM_TITLE, [plainText(` ${confirm.message}`), plainText(''), plainText(` ${CONFIRM_HINT}`)], options)
}
