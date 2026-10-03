import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import type { BoxOptions, RenderState } from './types.ts'

const CONFIRM_TITLE = 'Confirmação'
const CONFIRM_HINT = 'y confirma · n/Esc cancela'

export function renderConfirm(state: RenderState): string[] {
  const options = boxOptions(state)
  const confirm = state.confirm
  if (confirm === null) return renderBox(CONFIRM_TITLE, [], options)

  return renderBox(CONFIRM_TITLE, [plainText(` ${confirm.message}`), plainText(''), plainText(` ${CONFIRM_HINT}`)], options)
}

function boxOptions(state: RenderState): BoxOptions {
  return {
    columns: state.viewport.columns,
    rows: state.viewport.rows,
    utf8: state.utf8,
    color: state.color,
    banner: state.banner,
  }
}
